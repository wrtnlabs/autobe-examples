import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallNotificationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallNotificationLog";
import { IShoppingMallNotificationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationLog";
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

export async function patchShoppingMallSellerNotificationsLogs(props: {
  seller: SellerPayload;
  body: IShoppingMallNotificationLog.IRequest;
}): Promise<IPageIShoppingMallNotificationLog.ISummary> {
  // Since props.body does not have filtering or pagination properties, use defaults
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const where: Prisma.shopping_mall_notification_logsWhereInput = {
    deleted_at: null,
  };
  const data = await MyGlobal.prisma.shopping_mall_notification_logs.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      event_type: true,
      event_metadata: true,
      notification_template_id: true,
      user_notification_id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_notification_logs.count({
    where,
  });
  return {
    data: data.map((record) => ({
      id: record.id,
      eventType: record.event_type,
      eventMetadata:
        record.event_metadata === null ? undefined : record.event_metadata,
      notificationTemplateId:
        record.notification_template_id === null
          ? undefined
          : record.notification_template_id,
      userNotificationId:
        record.user_notification_id === null
          ? undefined
          : record.user_notification_id,
      createdAt: toISOStringSafe(record.created_at),
      updatedAt: toISOStringSafe(record.updated_at),
      deletedAt:
        record.deleted_at === null
          ? undefined
          : toISOStringSafe(record.deleted_at),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
