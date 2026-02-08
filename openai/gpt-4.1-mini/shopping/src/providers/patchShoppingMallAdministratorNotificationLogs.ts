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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorNotificationLogs(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallNotificationLog.IRequest;
}): Promise<IPageIShoppingMallNotificationLog.ISummary> {
  const page: number = (() => {
    const p = (props.body as any).page;
    if (typeof p === "number" && p > 0) return p;
    return 1;
  })();
  const limit: number = (() => {
    const l = (props.body as any).limit;
    if (typeof l === "number" && l > 0) return l;
    return 100;
  })();
  const skip: number = (page - 1) * limit;
  const where: Prisma.shopping_mall_notification_logsWhereInput = {
    deleted_at: null,
  };
  const records =
    await MyGlobal.prisma.shopping_mall_notification_logs.findMany({
      where,
      take: limit,
      skip,
      orderBy: [{ created_at: "desc" }, { event_type: "asc" }],
      select: {
        id: true,
        notification_template_id: true,
        user_notification_id: true,
        event_type: true,
        event_metadata: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  const total = await MyGlobal.prisma.shopping_mall_notification_logs.count({
    where,
  });
  return {
    data: records.map((record) => ({
      id: record.id,
      notification_template_id: record.notification_template_id ?? null,
      user_notification_id: record.user_notification_id ?? null,
      event_type: record.event_type,
      event_metadata: record.event_metadata ?? null,
      created_at: record.created_at ? toISOStringSafe(record.created_at) : null,
      updated_at: record.updated_at ? toISOStringSafe(record.updated_at) : null,
      deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}
