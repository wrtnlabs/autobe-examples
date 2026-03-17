import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommentVoteCollector } from "../collectors/CommunityPlatformCommentVoteCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommentVoteTransformer } from "../transformers/CommunityPlatformCommentVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberCommentsCommentIdVotes(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentVote.ICreate;
}): Promise<ICommunityPlatformCommentVote> {
  // 1. Verify comment exists and is not deleted
  const comment =
    await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
      where: {
        id: props.commentId,
        deleted_at: null,
      },
      select: { id: true },
    });
  // 2. Check if member already voted on this comment
  const existingVote =
    await MyGlobal.prisma.community_platform_comment_votes.findFirst({
      where: {
        community_platform_member_id: props.member.id,
        community_platform_comment_id: props.commentId,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (existingVote) {
    throw new HttpException("Member already voted on this comment", 409);
  }
  // 3. Use Collector to create vote data
  const vote = await MyGlobal.prisma.community_platform_comment_votes.create({
    data: await CommunityPlatformCommentVoteCollector.collect({
      body: props.body,
      communityPlatformMembers: { id: props.member.id } satisfies IEntity,
      communityPlatformComments: { id: props.commentId } satisfies IEntity,
    }),
    ...CommunityPlatformCommentVoteTransformer.select(),
  });
  // 4. Transform and return
  return await CommunityPlatformCommentVoteTransformer.transform(vote);
}
