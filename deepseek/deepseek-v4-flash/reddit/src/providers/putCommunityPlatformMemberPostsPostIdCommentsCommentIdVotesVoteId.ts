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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function putCommunityPlatformMemberPostsPostIdCommentsCommentIdVotesVoteId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentVote.IUpdate;
}): Promise<ICommunityPlatformCommentVote> {
  // 1. Verify the post exists and is not deleted
  await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
    where: { id: props.postId, deleted_at: null },
    select: { id: true },
  });
  // 2. Verify the comment exists, belongs to the post, and is not deleted
  const comment =
    await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
      where: {
        id: props.commentId,
        community_platform_post_id: props.postId,
        deleted_at: null,
      },
      select: { id: true, community_platform_member_id: true },
    });
  // 3. Verify the vote exists and belongs to the comment
  const vote =
    await MyGlobal.prisma.community_platform_comment_votes.findUniqueOrThrow({
      where: {
        id: props.voteId,
        community_platform_comment_id: props.commentId,
      },
      select: { id: true, value: true, community_platform_member_id: true },
    });
  // 4. Verify the authenticated member is the voter
  if (vote.community_platform_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 5. Handle no-op cases: value not provided or same as current
  if (props.body.value === undefined || props.body.value === vote.value) {
    const existing =
      await MyGlobal.prisma.community_platform_comment_votes.findUniqueOrThrow({
        where: { id: props.voteId },
        ...CommunityPlatformCommentVoteTransformer.select(),
      });
    return await CommunityPlatformCommentVoteTransformer.transform(existing);
  }
  // 6. Validate new value is +1 or -1
  const newValue: number = props.body.value;
  if (newValue !== 1 && newValue !== -1) {
    throw new HttpException("Unprocessable Entity", 422);
  }
  // Calculate the score/karma delta
  const delta: number = newValue - vote.value;
  // 7-9. Update vote, comment score, and author karma atomically
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.community_platform_comment_votes.update({
      where: { id: props.voteId },
      data: {
        value: newValue,
        updated_at: new Date().toISOString(),
      },
    });
    await tx.community_platform_comments.update({
      where: { id: props.commentId },
      data: {
        vote_score: { increment: delta },
      },
    });
    await tx.community_platform_profiles.update({
      where: { member_id: comment.community_platform_member_id },
      data: {
        karma: { increment: delta },
      },
    });
    return await tx.community_platform_comment_votes.findUniqueOrThrow({
      where: { id: props.voteId },
      ...CommunityPlatformCommentVoteTransformer.select(),
    });
  });
  return await CommunityPlatformCommentVoteTransformer.transform(updated);
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
// import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
// import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
// import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
// import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putCommunityPlatformMemberPostsPostIdCommentsCommentIdVotesVoteId(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
//   commentId: string & tags.Format<"uuid">;
//   voteId: string & tags.Format<"uuid">;
//   body: ICommunityPlatformCommentVote.IUpdate;
// }): Promise<ICommunityPlatformCommentVote> {
//   await MyGlobal.prisma.community_platform_comment_votes.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.community_platform_comment_votes.findUniqueOrThrow({
//     where: { ... },
//     ...CommunityPlatformCommentVoteTransformer.select(),
//   });
//   return await CommunityPlatformCommentVoteTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------