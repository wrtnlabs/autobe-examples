import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunitySystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemSetting";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getRedditCommunityAdminRedditCommunitySystemSettingsName(props: {
  admin: AdminPayload;
  name: string;
}): Promise<IRedditCommunitySystemSetting> {
  const systemSetting =
    await MyGlobal.prisma.reddit_community_system_settings.findUnique({
      where: { name: props.name },
    });

  if (!systemSetting) {
    throw new HttpException(
      `System setting with name '${props.name}' not found`,
      404,
    );
  }

  return {
    id: systemSetting.id,
    name: systemSetting.name,
    value: systemSetting.value,
    description: systemSetting.description ?? "",
    created_at: toISOStringSafe(systemSetting.created_at),
    updated_at: toISOStringSafe(systemSetting.updated_at),
  };
}
