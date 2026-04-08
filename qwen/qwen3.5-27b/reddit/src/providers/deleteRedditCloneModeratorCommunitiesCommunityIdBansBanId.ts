import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditCloneModeratorCommunitiesCommunityIdBansBanId(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the ban record
  const ban =
    await MyGlobal.prisma.reddit_clone_community_bans.findUniqueOrThrow({
      where: { id: props.banId },
      select: {
        id: true,
        reddit_clone_community_id: true,
        deleted_at: true,
      },
    });
  // Verify ban belongs to the specified community
  if (ban.reddit_clone_community_id !== props.communityId) {
    throw new HttpException("Not Found", 404);
  }
  // Check if ban is already deleted
  if (ban.deleted_at !== null) {
    throw new HttpException("Conflict", 409);
  }
  // Verify moderator has privileges in the community
  const moderatorAssignment =
    await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
      where: {
        community: { id: props.communityId },
        userProfile: { id: props.moderator.id },
        deleted_at: null,
      },
    });
  if (moderatorAssignment === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Soft-delete the ban
  await MyGlobal.prisma.reddit_clone_community_bans.update({
    where: { id: props.banId },
    data: {
      deleted_at: new Date(),
    },
  });
}
