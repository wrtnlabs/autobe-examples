import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function postShoppingMallAdministratorNotificationLogs(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallNotificationLog.ICreate;
}): Promise<IShoppingMallNotificationLog> {
  // Extract event_type safely
  const eventTypeRaw = (props.body as any).event_type; // Use any to extract raw
  const event_type: string =
    typeof eventTypeRaw === "string" ? eventTypeRaw : "";
  if (event_type.trim() === "") {
    throw new HttpException("event_type is required", 400);
  }
  try {
    const now = toISOStringSafe(new Date());
    const created = await MyGlobal.prisma.$transaction(async (tx) => {
      return await tx.shopping_mall_notification_logs.create({
        data: {
          id: v4(),
          event_type: event_type,
          event_metadata: (props.body as any).event_metadata ?? null,
          notification_template_id:
            (props.body as any).notification_template_id ?? null,
          user_notification_id:
            (props.body as any).user_notification_id ?? null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });
    });
    return {
      id: created.id,
      event_type: created.event_type,
      event_metadata: created.event_metadata,
      notification_template_id: created.notification_template_id,
      user_notification_id: created.user_notification_id,
      created_at: created.created_at,
      updated_at: created.updated_at,
      deleted_at: created.deleted_at,
    } satisfies IShoppingMallNotificationLog;
  } catch {
    throw new HttpException("Failed to create notification log", 500);
  }
}
