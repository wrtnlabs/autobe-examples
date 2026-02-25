import { IEcommerceEmailTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceEmailTemplate";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceEmailTemplateCollector {
  export async function collect(props: {
    body: IEcommerceEmailTemplate.ICreate;
  }) {
    return {
      id: v4(),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      code: props.body.code,
      name: props.body.name,
      category: props.body.category,
      subject: props.body.subject,
      html_content: props.body.html_content,
      text_content: props.body.text_content,
      description: props.body.description ?? null,
      is_active: props.body.is_active,
      version: 1,
    } satisfies Prisma.ecommerce_email_templatesCreateInput;
  }
}
