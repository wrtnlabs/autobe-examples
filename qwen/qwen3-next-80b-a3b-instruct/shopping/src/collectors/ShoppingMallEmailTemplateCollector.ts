import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallEmailTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEmailTemplate";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallEmailTemplateCollector {
  export async function collect(props: {
    body: IShoppingMallEmailTemplate.ICreate;
  }) {
    return {
      id: v4(),
      name: props.body.templateKey,
      subject: props.body.subject,
      body: props.body.body,
      trigger: "",
      context: "",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.shopping_mall_email_templatesCreateInput;
  }
}
