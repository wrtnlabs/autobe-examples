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

export async function putRedditLikeAdminSystemSettingsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IRedditLikeSystemSetting.IUpdate;
}): Promise<IRedditLikeSystemSetting> {
  const { id, body } = props;

  await MyGlobal.prisma.reddit_like_system_settings.findUniqueOrThrow({
    where: { id },
  });

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.reddit_like_system_settings.update({
    where: { id },
    data: {
      value: body.value ?? undefined,
      description: body.description === null ? undefined : body.description,
      category: body.category === null ? undefined : body.category,
      is_public: body.is_public ?? undefined,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    key: updated.key,
    value: updated.value,
    description: updated.description ?? undefined,
    value_type: updated.value_type,
    category: updated.category ?? undefined,
    is_public: updated.is_public,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: now,
  };
}
