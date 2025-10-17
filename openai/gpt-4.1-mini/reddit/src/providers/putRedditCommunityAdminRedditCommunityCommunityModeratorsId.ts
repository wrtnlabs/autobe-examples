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

export async function putRedditCommunityAdminRedditCommunityCommunityModeratorsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IRedditCommunityCommunityModerator.IUpdate;
}): Promise<IRedditCommunityCommunityModerator> {
  const { id, body } = props;

  const updated = await MyGlobal.prisma.reddit_community_community_moderators
    .update({
      where: { id },
      data: {
        assigned_at: body.assigned_at,
        updated_at: body.updated_at,
      },
      select: {
        id: true,
        member_id: true,
        community_id: true,
        created_at: true,
        updated_at: true,
      },
    })
    .catch(() => null);

  if (updated === null) {
    throw new HttpException("Community moderator not found", 404);
  }

  return {
    id: updated.id,
    email: "",
    is_email_verified: false,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: undefined,
  };
}
