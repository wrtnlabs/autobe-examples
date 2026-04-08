import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityCommentTransformer } from "../transformers/RedditCommunityCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMemberPostsPostIdCommentsCommentIdVotes(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCommunityCommentVote.IUpdate;
}): Promise<IRedditCommunityComment> {
  const comment =
    await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
      where: { id: props.commentId, deleted_at: null },
      ...RedditCommunityCommentTransformer.select(),
    });
  if (comment.post.id !== props.postId) {
    throw new HttpException("Comment does not belong to specified post", 404);
  }
  if (comment.author.id === props.member.id) {
    throw new HttpException("Cannot vote on your own comment", 409);
  }
  const newVoteType = props.body.vote_type;
  const existingVote =
    await MyGlobal.prisma.reddit_community_comment_votes.findFirst({
      where: {
        reddit_community_comment_id: props.commentId,
        member_id: props.member.id,
        deleted_at: null,
      },
    });
  if (existingVote) {
    if (existingVote.vote_type === newVoteType) {
      return await RedditCommunityCommentTransformer.transform(comment);
    }
    if (newVoteType === null) {
      await MyGlobal.prisma.reddit_community_comment_votes.update({
        where: { id: existingVote.id },
        data: { deleted_at: new Date() },
      });
    } else {
      await MyGlobal.prisma.reddit_community_comment_votes.update({
        where: { id: existingVote.id },
        data: {
          vote_type: newVoteType,
          updated_at: new Date(),
        },
      });
    }
  } else {
    if (newVoteType !== null && newVoteType !== undefined) {
      await MyGlobal.prisma.reddit_community_comment_votes.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          member_id: props.member.id,
          reddit_community_comment_id: props.commentId,
          vote_type: newVoteType,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
      });
    }
  }
  const refreshedComment =
    await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
      where: { id: props.commentId, deleted_at: null },
      ...RedditCommunityCommentTransformer.select(),
    });
  return await RedditCommunityCommentTransformer.transform(refreshedComment);
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
// import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
// import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
// import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
// import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditCommunityMemberPostsPostIdCommentsCommentIdVotes(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
//   commentId: string & tags.Format<"uuid">;
//   body: IRedditCommunityCommentVote.IUpdate;
// }): Promise<IRedditCommunityComment> {
//   const record = await MyGlobal.prisma.reddit_community_comments.findFirstOrThrow({
//     ...RedditCommunityCommentTransformer.select(),
//     where: { ... },
//   });
//   return await RedditCommunityCommentTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------