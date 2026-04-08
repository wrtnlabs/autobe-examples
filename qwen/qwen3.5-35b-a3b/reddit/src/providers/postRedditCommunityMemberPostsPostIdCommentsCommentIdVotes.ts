import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityCommentVoteTransformer } from "../transformers/RedditCommunityCommentVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityMemberPostsPostIdCommentsCommentIdVotes(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCommunityCommentVote.ICreate;
}): Promise<IRedditCommunityCommentVote> {
  const comment =
    await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: {
        id: true,
        author: { select: { id: true } },
        reddit_community_post_id: true,
      },
    });
  if (comment.reddit_community_post_id !== props.postId) {
    throw new HttpException("Comment not found", 404);
  }
  if (comment.author.id === props.member.id) {
    throw new HttpException("You cannot vote on your own comment", 403);
  }
  const existingVote =
    await MyGlobal.prisma.reddit_community_comment_votes.findFirst({
      where: {
        member_id: props.member.id,
        reddit_community_comment_id: props.commentId,
        deleted_at: null,
      },
    });
  if (existingVote) {
    await MyGlobal.prisma.reddit_community_comment_votes.update({
      where: { id: existingVote.id },
      data: {
        vote_type: props.body.vote_type,
        updated_at: new Date(),
      },
    });
  } else {
    await MyGlobal.prisma.reddit_community_comment_votes.create({
      data: {
        id: v4(),
        vote_type: props.body.vote_type,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        member: { connect: { id: props.member.id } },
        comment: { connect: { id: props.commentId } },
      },
    });
  }
  const voteRecord =
    await MyGlobal.prisma.reddit_community_comment_votes.findFirst({
      where: {
        member_id: props.member.id,
        reddit_community_comment_id: props.commentId,
        deleted_at: null,
      },
    });
  if (voteRecord === null) {
    throw new HttpException("Vote record not found", 500);
  }
  const voteWithRelations =
    await MyGlobal.prisma.reddit_community_comment_votes.findUniqueOrThrow({
      where: { id: voteRecord.id },
      ...RedditCommunityCommentVoteTransformer.select(),
    });
  return await RedditCommunityCommentVoteTransformer.transform(
    voteWithRelations,
  );
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
// import { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
// import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
// import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditCommunityMemberPostsPostIdCommentsCommentIdVotes(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
//   commentId: string & tags.Format<"uuid">;
//   body: IRedditCommunityCommentVote.ICreate;
// }): Promise<IRedditCommunityCommentVote> {
//   const record = await MyGlobal.prisma.reddit_community_comment_votes.create({
//     data: await RedditCommunityCommentVoteCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...RedditCommunityCommentVoteTransformer.select(),
//   });
//   return await RedditCommunityCommentVoteTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------