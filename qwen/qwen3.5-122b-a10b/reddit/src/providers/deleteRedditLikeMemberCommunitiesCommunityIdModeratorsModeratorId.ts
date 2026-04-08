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

export async function deleteRedditLikeMemberCommunitiesCommunityIdModeratorsModeratorId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Verify community exists and is not soft-deleted
  const community =
    await MyGlobal.prisma.reddit_like_communities.findUniqueOrThrow({
      where: { id: props.communityId, deleted_at: null },
      select: { id: true, owner_id: true },
    });
  // 2. Verify authenticated user is the community owner
  if (community.owner_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Prevent removing the community owner
  if (props.moderatorId === props.member.id) {
    throw new HttpException("Cannot remove community owner", 400);
  }
  // 4. Verify moderator assignment exists
  await MyGlobal.prisma.reddit_like_community_moderators.findUniqueOrThrow({
    where: {
      reddit_like_community_id_reddit_like_member_id: {
        reddit_like_community_id: props.communityId,
        reddit_like_member_id: props.moderatorId,
      },
    },
  });
  // 5. Soft delete the moderator assignment
  await MyGlobal.prisma.reddit_like_community_moderators.update({
    where: {
      reddit_like_community_id_reddit_like_member_id: {
        reddit_like_community_id: props.communityId,
        reddit_like_member_id: props.moderatorId,
      },
    },
    data: {
      deleted_at: new Date(),
    },
  });
}
