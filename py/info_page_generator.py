import json

from jinja2 import Template

with open("info__template.html") as template_file:
    template = Template(template_file.read())

for lang in ("de", "en"):
    with open(f"lang/{lang}.json") as langJSON:
        lang_dict = json.loads(langJSON.read())

    sky_objects = lang_dict["skyObjects"]
    for object_id, object_info in sky_objects.items():
        object = {
            "id": object_id,
            "name": object_info["name"],
            "desc": object_info["desc"],
        }

        with open(f"object/{lang}/{object_id}.html", "w") as out:
            out.write(template.render(object=object))
