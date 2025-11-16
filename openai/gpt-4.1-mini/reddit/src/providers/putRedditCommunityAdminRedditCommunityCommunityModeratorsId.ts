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
  const existing =
    await MyGlobal.prisma.reddit_community_community_moderators.findUnique({
      where: { id: props.id },
    });

  if (existing === null) {
    throw new HttpException("Community moderator not found", 404);
  }

  const now = toISOStringSafe(new Date());

  const updated =
    await MyGlobal.prisma.reddit_community_community_moderators.update({
      where: { id: props.id },
      data: {
        email: props.body.email,
        updated_at: now,
      },
    });

  return {
    id: updated.id,
    email: updated.email,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  };
}
