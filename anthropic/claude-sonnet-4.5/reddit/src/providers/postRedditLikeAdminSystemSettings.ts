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

export async function postRedditLikeAdminSystemSettings(props: {
  admin: AdminPayload;
  body: IRedditLikeSystemSetting.ICreate;
}): Promise<IRedditLikeSystemSetting> {
  const { admin, body } = props;

  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.reddit_like_system_settings.create({
    data: {
      id: id,
      key: body.key,
      value: body.value,
      description: body.description ?? undefined,
      value_type: body.value_type,
      category: body.category ?? undefined,
      is_public: body.is_public,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: id,
    key: created.key,
    value: created.value,
    description: created.description ?? undefined,
    value_type: created.value_type,
    category: created.category ?? undefined,
    is_public: created.is_public,
    created_at: now,
    updated_at: now,
  };
}
