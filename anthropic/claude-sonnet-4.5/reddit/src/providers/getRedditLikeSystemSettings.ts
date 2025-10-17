import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSystemSetting";

export async function getRedditLikeSystemSettings(): Promise<IRedditLikeSystemSetting.IPublicList> {
  const settings = await MyGlobal.prisma.reddit_like_system_settings.findMany({
    where: {
      is_public: true,
    },
    orderBy: {
      category: "asc",
    },
  });

  return {
    settings: settings.map((setting) => ({
      id: setting.id as string & tags.Format<"uuid">,
      key: setting.key,
      value: setting.value,
      description: setting.description ?? undefined,
      value_type: setting.value_type,
      category: setting.category ?? undefined,
      is_public: setting.is_public,
      created_at: toISOStringSafe(setting.created_at),
      updated_at: toISOStringSafe(setting.updated_at),
    })),
  };
}
