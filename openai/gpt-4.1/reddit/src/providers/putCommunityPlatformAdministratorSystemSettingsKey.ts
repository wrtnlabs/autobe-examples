import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformSystemSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemSettings";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function putCommunityPlatformAdministratorSystemSettingsKey(props: {
  administrator: AdministratorPayload;
  key: string;
  body: ICommunityPlatformSystemSettings.IUpdate;
}): Promise<ICommunityPlatformSystemSettings> {
  const existing =
    await MyGlobal.prisma.community_platform_system_settings.findFirst({
      where: {
        key: props.key,
        deleted_at: null,
      },
    });

  if (!existing) {
    throw new HttpException("System setting not found.", 404);
  }

  const updateData: {
    value: string;
    description?: string | null;
    updated_at: string;
  } = {
    value: props.body.value,
    updated_at: toISOStringSafe(new Date()),
  };

  if (Object.prototype.hasOwnProperty.call(props.body, "description")) {
    updateData.description = props.body.description ?? null;
  }

  const updated =
    await MyGlobal.prisma.community_platform_system_settings.update({
      where: { id: existing.id },
      data: updateData,
    });

  return {
    id: updated.id,
    key: updated.key,
    value: updated.value,
    description:
      typeof updated.description === "undefined"
        ? undefined
        : updated.description,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      typeof updated.deleted_at === "undefined" || updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
