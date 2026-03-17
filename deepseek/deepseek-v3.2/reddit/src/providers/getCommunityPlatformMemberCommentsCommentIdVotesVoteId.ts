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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommentVoteTransformer } from "../transformers/CommunityPlatformCommentVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformMemberCommentsCommentIdVotesVoteId(props: {
  member: MemberPayload;
  commentId: string;
  voteId: string;
}): Promise<ICommunityPlatformCommentVote> {
  // Verify the comment exists
  await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
    where: { id: props.commentId },
  });
  // Retrieve the vote with all its relations
  const vote =
    await MyGlobal.prisma.community_platform_comment_votes.findUniqueOrThrow({
      where: { id: props.voteId },
      ...CommunityPlatformCommentVoteTransformer.select(),
    });
  // Authorization check: member can only access their own votes
  if (vote.member.id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Ensure the vote is for the specified comment
  if (vote.comment.id !== props.commentId) {
    throw new HttpException("Vote not found for this comment", 404);
  }
  // Transform and return the vote
  return await CommunityPlatformCommentVoteTransformer.transform(vote);
}
