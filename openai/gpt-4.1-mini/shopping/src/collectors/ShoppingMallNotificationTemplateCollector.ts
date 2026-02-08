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
    return {
      id,
      template_code: "",
      template_name: "",
      content: "",
      parameters: "",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.shopping_mall_notification_templatesCreateInput;
  }
}
