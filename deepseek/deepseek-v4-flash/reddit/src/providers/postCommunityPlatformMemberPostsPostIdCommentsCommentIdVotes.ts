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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postCommunityPlatformMemberPostsPostIdCommentsCommentIdVotes(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentVote.ICreate;
}): Promise<ICommunityPlatformCommentVote> {
  // 1. Look up the comment — must exist, not soft-deleted, and belong to the specified post
  const comment = await MyGlobal.prisma.community_platform_comments.findFirst({
    where: {
      id: props.commentId,
      deleted_at: null,
      community_platform_post_id: props.postId,
    },
    select: {
      id: true,
      community_platform_member_id: true,
      vote_score: true,
    },
  });
  if (comment === null) {
    throw new HttpException(
      "Comment not found, is deleted, or does not belong to the specified post",
      404,
    );
  }
  // 2. Look up the post — must exist and not be soft-deleted
  const post = await MyGlobal.prisma.community_platform_posts.findFirst({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: {
      id: true,
      community_id: true,
    },
  });
  if (post === null) {
    throw new HttpException("Post not found or has been deleted", 404);
  }
  // 3. Look up the community from the post
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        id: post.community_id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  // 4. Check the member is not banned from this community
  const activeBan =
    await MyGlobal.prisma.community_platform_community_bans.findFirst({
      where: {
        community_platform_community_id: community.id,
        community_platform_member_id: props.member.id,
        OR: [{ expired_at: null }, { expired_at: { gt: new Date() } }],
      },
      select: { id: true },
    });
  if (activeBan !== null) {
    throw new HttpException(
      "You are banned from this community and cannot vote on its content",
      403,
    );
  }
  // 5. Reject self-voting
  if (comment.community_platform_member_id === props.member.id) {
    throw new HttpException("You cannot vote on your own comment", 400);
  }
  // 6. Query for existing vote by this member on this comment
  const existingVote =
    await MyGlobal.prisma.community_platform_comment_votes.findFirst({
      where: {
        community_platform_member_id: props.member.id,
        community_platform_comment_id: props.commentId,
      },
      select: { id: true, value: true },
    });
  let delta: number;
  if (existingVote !== null) {
    // Existing vote — update value, delta = new - old
    delta = props.body.value - existingVote.value;
    await MyGlobal.prisma.community_platform_comment_votes.update({
      where: { id: existingVote.id },
      data: {
        value: props.body.value,
        updated_at: new Date(),
      },
    });
  } else {
    // New vote — delta = vote value
    delta = props.body.value;
    await MyGlobal.prisma.community_platform_comment_votes.create({
      data: await CommunityPlatformCommentVoteCollector.collect({
        body: props.body,
        communityPlatformMembers: { id: props.member.id },
        communityPlatformMemberSessions: { id: props.member.session_id },
        communityPlatformComments: { id: props.commentId },
      }),
    });
  }
  // 7. Update comment's denormalized vote_score
  await MyGlobal.prisma.community_platform_comments.update({
    where: { id: props.commentId },
    data: {
      vote_score: { increment: delta },
    },
  });
  // 8. Update comment author's karma in their profile
  await MyGlobal.prisma.community_platform_profiles.update({
    where: { member_id: comment.community_platform_member_id },
    data: {
      karma: { increment: delta },
    },
  });
  // 9. Fetch and return the full vote record via Transformer
  const record =
    await MyGlobal.prisma.community_platform_comment_votes.findUniqueOrThrow({
      where: {
        community_platform_member_id_community_platform_comment_id: {
          community_platform_member_id: props.member.id,
          community_platform_comment_id: props.commentId,
        },
      },
      ...CommunityPlatformCommentVoteTransformer.select(),
    });
  return await CommunityPlatformCommentVoteTransformer.transform(record);
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
// export async function postCommunityPlatformMemberPostsPostIdCommentsCommentIdVotes(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
//   commentId: string & tags.Format<"uuid">;
//   body: ICommunityPlatformCommentVote.ICreate;
// }): Promise<ICommunityPlatformCommentVote> {
//   const record = await MyGlobal.prisma.community_platform_comment_votes.create({
//     data: await CommunityPlatformCommentVoteCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...CommunityPlatformCommentVoteTransformer.select(),
//   });
//   return await CommunityPlatformCommentVoteTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------