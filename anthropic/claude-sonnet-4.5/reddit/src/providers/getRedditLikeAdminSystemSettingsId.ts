import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSystemSetting";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getRedditLikeAdminSystemSettingsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IRedditLikeSystemSetting> {
  const { id } = props;

  const setting =
    await MyGlobal.prisma.reddit_like_system_settings.findUniqueOrThrow({
      where: { id },
    });

  return {
    id: setting.id as string & tags.Format<"uuid">,
    key: setting.key,
    value: setting.value,
    description: setting.description === null ? undefined : setting.description,
    value_type: setting.value_type,
    category: setting.category === null ? undefined : setting.category,
    is_public: setting.is_public,
    created_at: toISOStringSafe(setting.created_at),
    updated_at: toISOStringSafe(setting.updated_at),
  };
}
