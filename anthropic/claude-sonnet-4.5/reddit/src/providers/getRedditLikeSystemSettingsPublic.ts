import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSystemSetting";

export async function getRedditLikeSystemSettingsPublic(): Promise<IRedditLikeSystemSetting.IPublic> {
  const setting = await MyGlobal.prisma.reddit_like_system_settings.findFirst({
    where: {
      is_public: true,
    },
    select: {
      key: true,
      value: true,
      description: true,
      value_type: true,
      category: true,
    },
  });

  if (!setting) {
    throw new HttpException("No public system settings found", 404);
  }

  return {
    key: setting.key,
    value: setting.value,
    description: setting.description ?? undefined,
    value_type: setting.value_type,
    category: setting.category ?? undefined,
  };
}
