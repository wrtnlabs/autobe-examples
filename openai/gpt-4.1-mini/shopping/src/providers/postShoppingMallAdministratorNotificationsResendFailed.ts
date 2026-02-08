import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMall";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorNotificationsResendFailed(props: {
  administrator: AdministratorPayload;
  body: IShoppingMall.IRequest;
}): Promise<IShoppingMall.IResponse> {
  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const failedDeliveries =
      await tx.shopping_mall_notification_deliveries.findMany({
        where: { status: "failed" },
        include: { notificationTemplate: true },
      });
    for (const delivery of failedDeliveries) {
      try {
        await tx.shopping_mall_notification_deliveries.update({
          where: { id: delivery.id },
          data: { status: "retrying", updated_at: now },
        });
        await tx.shopping_mall_notification_logs.create({
          data: {
            id: v4() as string & tags.Format<"uuid">,
            event_type: "resend_failed",
            created_at: now,
            updated_at: now,
          },
        });
      } catch {
        // Continue with other deliveries on error
      }
    }
    return {};
  });
}
