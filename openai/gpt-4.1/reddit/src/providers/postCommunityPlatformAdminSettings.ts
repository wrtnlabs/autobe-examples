import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSettings";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postCommunityPlatformAdminSettings(props: {
  admin: AdminPayload;
  body: ICommunityPlatformSettings.ICreate;
}): Promise<ICommunityPlatformSettings> {
  // 1. Check for existing setting_key (uniqueness enforced)
  const exists = await MyGlobal.prisma.community_platform_settings.findUnique({
    where: { setting_key: props.body.setting_key },
    select: { id: true },
  });
  if (exists) {
    throw new HttpException("A setting with this key already exists.", 409);
  }
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.community_platform_settings.create({
    data: {
      id: v4(),
      setting_key: props.body.setting_key,
      value: props.body.value,
      type: props.body.type,
      description: props.body.description,
      is_active: props.body.is_active,
      created_at: now,
      updated_at: now,
    },
  });
  return {
    id: created.id,
    setting_key: created.setting_key,
    value: created.value,
    type: created.type,
    description: created.description,
    is_active: created.is_active,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
