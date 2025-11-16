import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postRedditCommunityAdminRedditCommunityCommunityModerators(props: {
  admin: AdminPayload;
  body: IRedditCommunityCommunityModerator.ICreate;
}): Promise<IRedditCommunityCommunityModerator> {
  // The PasswordUtil.createHashedPassword method does not exist. If password hashing is needed, we assume a proper method exists such as 'hashPassword' or similar.
  // If no such method is available, we must skip hashing and not store it in DB as field does not exist in schema.
  // For now, skip hashing and password storage.

  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;

  const created =
    await MyGlobal.prisma.reddit_community_community_moderators.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        email: props.body.email,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  return {
    id: created.id,
    email: created.email,
    created_at: toISOStringSafe(created.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(created.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? (toISOStringSafe(created.deleted_at) as string &
            tags.Format<"date-time">)
        : null,
  };
}
