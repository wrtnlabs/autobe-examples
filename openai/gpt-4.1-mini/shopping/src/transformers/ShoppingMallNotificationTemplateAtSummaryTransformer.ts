import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationTemplate";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallNotificationTemplateAtSummaryTransformer {
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
        userNotifications: { select: {} },
        notificationDeliveries: { select: {} },
        logs: { select: {} },
      },
    } satisfies Prisma.shopping_mall_notification_templatesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallNotificationTemplate.ISummary> {
    return {
      id: input.id,
      template_code: input.template_code,
      template_name: input.template_name,
      content: input.content,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
