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

export async function deleteRedditCommunityMemberCommunitiesCommunityIdModeratorsModeratorId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<void> {
  const moderatorAssignment =
    await MyGlobal.prisma.reddit_community_moderators.findFirst({
      where: {
        reddit_community_community_id: props.communityId,
        reddit_community_member_id: props.moderatorId,
        deleted_at: null,
      },
    });
  if (moderatorAssignment === null) {
    throw new HttpException("Moderator assignment not found", 404);
  }
  const owner = await MyGlobal.prisma.reddit_community_moderators.findFirst({
    where: {
      reddit_community_community_id: props.communityId,
      role: "owner",
      deleted_at: null,
    },
  });
  if (owner === null) {
    throw new HttpException("Community owner not found", 404);
  }
  if (owner.reddit_community_member_id !== props.member.id) {
    throw new HttpException(
      "Forbidden: Only community owner can remove moderators",
      403,
    );
  }
  if (
    moderatorAssignment.reddit_community_member_id ===
    owner.reddit_community_member_id
  ) {
    throw new HttpException("Cannot remove community owner", 400);
  }
  await MyGlobal.prisma.reddit_community_moderators.update({
    where: {
      id: moderatorAssignment.id,
    },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
