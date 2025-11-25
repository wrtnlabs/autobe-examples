import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformSystemSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemSettings";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function getCommunityPlatformAdministratorSystemSettingsKey(props: {
  administrator: AdministratorPayload;
  key: string;
}): Promise<ICommunityPlatformSystemSettings> {
  const setting =
    await MyGlobal.prisma.community_platform_system_settings.findUnique({
      where: { key: props.key },
    });
  if (!setting) {
    throw new HttpException("System setting not found.", 404);
  }
  return {
    id: setting.id as string & tags.Format<"uuid">,
    key: setting.key,
    value: setting.value,
    description: setting.description === null ? undefined : setting.description,
    created_at: toISOStringSafe(setting.created_at),
    updated_at: toISOStringSafe(setting.updated_at),
    deleted_at:
      setting.deleted_at === null
        ? undefined
        : toISOStringSafe(setting.deleted_at),
  };
}
