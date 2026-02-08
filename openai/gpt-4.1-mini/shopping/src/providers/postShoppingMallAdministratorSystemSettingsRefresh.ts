import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function postShoppingMallAdministratorSystemSettingsRefresh(props: {
  administrator: AdministratorPayload;
}): Promise<void> {
  try {
    const now: string & import("typia").tags.Format<"date-time"> =
      toISOStringSafe(new Date());

    const id: string & import("typia").tags.Format<"uuid"> = v4();

    await MyGlobal.prisma.shopping_mall_administrative_audit_logs.create({
      data: {
        id: id,
        administrator_id: props.administrator.id,
        action_type: "refresh",
        target_entity: "system",
        target_id: id,
        action_description: "System settings refreshed",
        created_at: now,
        updated_at: now,
      },
    });
  } catch {
    throw new HttpException("Failed to refresh system settings", 500);
  }
}
