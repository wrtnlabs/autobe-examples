import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationTemplate";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallNotificationTemplateTransformer {
  export type Payload = Prisma.shopping_mall_notification_templatesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        template_code: true,
        template_name: true,
        content: true,
        parameters: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        userNotifications: true,
        notificationDeliveries: true,
        logs: true,
      },
    } satisfies Prisma.shopping_mall_notification_templatesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallNotificationTemplate> {
    return {
      id: input.id,
      templateCode: input.template_code,
      templateName: input.template_name,
      content: input.content,
      parameters: input.parameters,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
