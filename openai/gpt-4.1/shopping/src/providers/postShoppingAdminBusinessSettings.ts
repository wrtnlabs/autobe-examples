import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingBusinessSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingBusinessSetting";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingAdminBusinessSettings(props: {
  admin: AdminPayload;
  body: IShoppingBusinessSetting.ICreate;
}): Promise<IShoppingBusinessSetting> {
  // Check for duplicate key (not soft-deleted)
  const existing = await MyGlobal.prisma.shopping_business_settings.findFirst({
    where: {
      setting_key: props.body.setting_key,
      deleted_at: null,
    },
  });
  if (existing) {
    throw new HttpException("Duplicate setting_key", 409);
  }

  // Timestamp for row creation and update
  const now = toISOStringSafe(new Date());

  // Insert new entry
  const created = await MyGlobal.prisma.shopping_business_settings.create({
    data: {
      id: v4(),
      setting_key: props.body.setting_key,
      setting_value: props.body.setting_value,
      description: props.body.description ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    setting_key: created.setting_key,
    setting_value: created.setting_value,
    description: created.description ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
