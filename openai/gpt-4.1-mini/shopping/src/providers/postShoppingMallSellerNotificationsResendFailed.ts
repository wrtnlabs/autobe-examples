import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMall";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerNotificationsResendFailed(props: {
  seller: SellerPayload;
  body: IShoppingMall.IRequest;
}): Promise<IShoppingMall.IResponse> {
  let totalConsidered = 0;
  let totalRetried = 0;
  let totalSkipped = 0;
  let totalFailed = 0;
  const deliveries =
    await MyGlobal.prisma.shopping_mall_notification_deliveries.findMany({
      where: { status: "failed" },
      include: {
        notificationTemplate: true,
        userNotification: true,
      },
    });
  totalConsidered = deliveries.length;
  for (const delivery of deliveries) {
    try {
      const now = toISOStringSafe(new Date());
      await MyGlobal.prisma.$transaction(async (tx) => {
        await tx.shopping_mall_notification_deliveries.update({
          where: { id: delivery.id },
          data: {
            status: "pending",
            updated_at: now,
          },
        });
        await tx.shopping_mall_notification_logs.create({
          data: {
            id: v4(),
            event_type: "retry",
            created_at: now,
            updated_at: now,
          },
        });
      });
      totalRetried += 1;
    } catch {
      totalFailed += 1;
    }
  }
  return {};
}
