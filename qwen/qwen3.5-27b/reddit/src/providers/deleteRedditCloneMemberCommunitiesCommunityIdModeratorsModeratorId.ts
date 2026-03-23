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

export async function deleteRedditCloneMemberCommunitiesCommunityIdModeratorsModeratorId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Verify community exists and is not soft-deleted
  const community =
    await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
      where: {
        id: props.communityId,
        deleted_at: null,
      },
      select: {
        id: true,
        owner_id: true,
      },
    });
  // Step 2: Verify requesting member is the owner
  if (community.owner_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Verify moderator assignment exists and is not soft-deleted
  const moderatorAssignment =
    await MyGlobal.prisma.reddit_clone_community_moderators.findUniqueOrThrow({
      where: {
        reddit_clone_communities_id_reddit_clone_members_id: {
          reddit_clone_communities_id: props.communityId,
          reddit_clone_members_id: props.moderatorId,
        },
        deleted_at: null,
      },
      select: {
        id: true,
        role: true,
      },
    });
  // Step 4: Verify moderator being removed is not the owner
  if (moderatorAssignment.role === "owner") {
    throw new HttpException("Cannot remove community owner", 403);
  }
  // Step 5: Perform soft delete
  await MyGlobal.prisma.reddit_clone_community_moderators.update({
    where: {
      id: moderatorAssignment.id,
    },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}
