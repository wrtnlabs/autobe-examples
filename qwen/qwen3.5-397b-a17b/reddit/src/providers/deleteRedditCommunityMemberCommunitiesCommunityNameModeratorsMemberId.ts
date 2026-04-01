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

export async function deleteRedditCommunityMemberCommunitiesCommunityNameModeratorsMemberId(props: {
  member: MemberPayload;
  communityName: string;
  memberId: string & tags.Format<"uuid">;
}): Promise<void> {
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { name: props.communityName },
      select: { id: true, reddit_community_member_id: true, deleted_at: true },
    });
  if (community === null || community.deleted_at !== null) {
    throw new HttpException("Community not found", 404);
  }
  if (community.reddit_community_member_id !== props.member.id) {
    throw new HttpException("Only community owner can remove moderators", 403);
  }
  const moderator = await MyGlobal.prisma.reddit_community_moderators.findFirst(
    {
      where: {
        community_id: community.id,
        member_id: props.memberId,
        deleted_at: null,
      },
      select: { id: true, member_id: true },
    },
  );
  if (moderator === null) {
    throw new HttpException("Moderator not found", 404);
  }
  if (moderator.member_id === community.reddit_community_member_id) {
    throw new HttpException(
      "Cannot remove community owner from moderators",
      403,
    );
  }
  await MyGlobal.prisma.reddit_community_moderators.update({
    where: { id: moderator.id },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}
