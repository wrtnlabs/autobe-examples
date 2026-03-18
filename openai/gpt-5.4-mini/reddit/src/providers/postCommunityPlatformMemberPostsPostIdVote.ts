import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
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

export async function postCommunityPlatformMemberPostsPostIdVote(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformVote.ICreate;
}): Promise<ICommunityPlatformVote> {
  if (props.body.direction !== 1 && props.body.direction !== -1) {
    throw new HttpException("Invalid vote direction", 400);
  }
  await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true },
  });
  const vote = await MyGlobal.prisma.$transaction(async (tx) => {
    const existing = await tx.community_platform_votes.findFirst({
      where: {
        community_platform_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        community_platform_member_id: true,
        direction: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
    if (existing === null) {
      return await tx.community_platform_votes.create({
        data: {
          id: v4(),
          community_platform_member_id: props.member.id,
          direction: props.body.direction,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
        select: {
          id: true,
          community_platform_member_id: true,
          direction: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      });
    }
    if (existing.direction === props.body.direction) return existing;
    return await tx.community_platform_votes.update({
      where: { id: existing.id },
      data: {
        direction: props.body.direction,
        updated_at: new Date(),
      },
      select: {
        id: true,
        community_platform_member_id: true,
        direction: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  });
  return {
    id: vote.id,
    communityPlatformMemberId: vote.community_platform_member_id,
    member: props.member,
    direction: vote.direction,
    createdAt: toISOStringSafe(vote.created_at),
    updatedAt: toISOStringSafe(vote.updated_at),
    deletedAt:
      vote.deleted_at === null ? null : toISOStringSafe(vote.deleted_at),
  };
}
