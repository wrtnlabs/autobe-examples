import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityMembersMemberId(props: {
  memberId: string;
}): Promise<ICommunityMember> {
  const member = await MyGlobal.prisma.community_members.findUnique({
    where: { id: props.memberId },
    select: {
      id: true,
      display_name: true,
      bio: true,
      avatar_url: true,
      is_email_verified: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!member || member.deleted_at !== null) {
    throw new HttpException("Member not found", 404);
  }
  const karmaScore = await MyGlobal.prisma.community_karma_scores.findUnique({
    where: {
      actor_id_actor_type: {
        actor_id: props.memberId,
        actor_type: "member",
      },
    },
    select: {
      karma_score: true,
    },
  });
  const postCount = await MyGlobal.prisma.community_post_votes.count({
    where: {
      member_id: props.memberId,
      deleted_at: null,
    },
  });
  const commentCount = await MyGlobal.prisma.community_comment_votes.count({
    where: {
      community_member_id: props.memberId,
    },
  });
  return {
    id: member.id,
    display_name: member.display_name,
    bio: member.bio,
    avatar_url: member.avatar_url,
    is_email_verified: member.is_email_verified,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    karma_score: karmaScore?.karma_score ?? 0,
    post_count: postCount,
    comment_count: commentCount,
  };
}
