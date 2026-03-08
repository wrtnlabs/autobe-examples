import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditPlatformMemberCommunitiesCommunityIdModeratorsModeratorId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify community exists and is not deleted
  const community =
    await MyGlobal.prisma.reddit_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: { id: true, owner_id: true, deleted_at: true },
    });
  // Verify authenticated member is the community owner
  if (community.owner_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify moderator assignment exists
  const moderatorAssignment =
    await MyGlobal.prisma.reddit_platform_community_moderators.findUniqueOrThrow(
      {
        where: {
          reddit_platform_member_id_reddit_platform_community_id: {
            reddit_platform_member_id: props.moderatorId,
            reddit_platform_community_id: props.communityId,
          },
        },
        select: { id: true, reddit_platform_member_id: true },
      },
    );
  // Prevent removal of the community owner
  if (moderatorAssignment.reddit_platform_member_id === community.owner_id) {
    throw new HttpException("Cannot remove community owner", 400);
  }
  // Soft delete the moderator assignment
  const now = new Date();
  await MyGlobal.prisma.reddit_platform_community_moderators.update({
    where: { id: moderatorAssignment.id },
    data: {
      deleted_at: toISOStringSafe(now),
      updated_at: toISOStringSafe(now),
    },
  });
}
