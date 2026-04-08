import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
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

export async function putRedditCommunityMemberPostsPostIdCommentsCommentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCommunityComment.IUpdate;
}): Promise<IRedditCommunityComment> {
  // Validate content if provided
  if (props.body.content !== undefined) {
    const content = props.body.content;
    if (typeof content !== "string" || content.trim().length === 0) {
      throw new HttpException(
        "Content cannot be empty or whitespace-only",
        400,
      );
    }
  }
  // Find comment to verify existence, ownership, and post association
  const comment =
    await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: {
        id: true,
        reddit_community_post_id: true,
        reddit_community_member_id: true,
        content: true,
        updated_at: true,
      },
    });
  // Verify comment belongs to the specified post
  if (comment.reddit_community_post_id !== props.postId) {
    throw new HttpException(
      "Comment does not belong to the specified post",
      404,
    );
  }
  // Verify authenticated user owns the comment
  if (comment.reddit_community_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Update the comment - only update content if provided
  await MyGlobal.prisma.reddit_community_comments.update({
    where: { id: props.commentId },
    data: {
      ...(props.body.content !== undefined && { content: props.body.content }),
      updated_at: new Date(),
    },
  });
  // Fetch full updated comment with all relations
  const updated =
    await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      ...RedditCommunityCommentTransformer.select(),
    });
  return await RedditCommunityCommentTransformer.transform(updated);
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
// import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
// import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
// import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
// import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putRedditCommunityMemberPostsPostIdCommentsCommentId(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
//   commentId: string & tags.Format<"uuid">;
//   body: IRedditCommunityComment.IUpdate;
// }): Promise<IRedditCommunityComment> {
//   await MyGlobal.prisma.reddit_community_comments.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
//     where: { ... },
//     ...RedditCommunityCommentTransformer.select(),
//   });
//   return await RedditCommunityCommentTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------