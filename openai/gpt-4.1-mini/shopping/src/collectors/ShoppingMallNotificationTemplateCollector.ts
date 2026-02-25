import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationTemplate";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallNotificationTemplateCollector {
  export async function collect(props: {
    body: IShoppingMallNotificationTemplate.ICreate;
  }) {
    const id: string = v4();
    const now = new Date();
    return {
      id,
      template_code: props.body.template_code,
      template_name: props.body.template_name,
      content: props.body.content,
      parameters: props.body.parameters,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      // HasMany relations are not created here, omitted from create input
    } satisfies Prisma.shopping_mall_notification_templatesCreateInput;
  }
}
