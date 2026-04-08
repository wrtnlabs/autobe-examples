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
import { RedditCommunityCommentCollector } from "../collectors/RedditCommunityCommentCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityCommentTransformer } from "../transformers/RedditCommunityCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityMemberPostsPostIdComments(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityComment.ICreate;
}): Promise<IRedditCommunityComment> {
  // Validate post exists and is not deleted
  const post = await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: {
      id: true,
      community: { select: { id: true } },
      comment_count: true,
    },
  });
  // Check if user is banned from the post's community
  const banRecord =
    await MyGlobal.prisma.reddit_community_ban_records.findFirst({
      where: {
        user: { id: props.member.id },
        community: { id: post.community.id },
        deleted_at: null,
      },
    });
  if (banRecord !== null) {
    throw new HttpException("You are banned from this community", 403);
  }
  // Validate parent comment if provided
  if (props.body.redditCommunityCommentId !== undefined) {
    const parentCommentId = props.body.redditCommunityCommentId;
    if (parentCommentId !== null) {
      const parentComment =
        await MyGlobal.prisma.reddit_community_comments.findFirst({
          where: {
            id: parentCommentId,
            deleted_at: null,
          },
          select: { id: true },
        });
      if (parentComment === null) {
        throw new HttpException("Parent comment not found", 404);
      }
    }
  }
  // Create comment
  const createdComment = await MyGlobal.prisma.reddit_community_comments.create(
    {
      data: await RedditCommunityCommentCollector.collect({
        body: props.body,
        redditCommunityPosts: { id: props.postId },
        redditCommunityMembers: { id: props.member.id },
      }),
      ...RedditCommunityCommentTransformer.select(),
    },
  );
  // Update post comment count
  await MyGlobal.prisma.reddit_community_posts.update({
    where: { id: props.postId },
    data: {
      comment_count: post.comment_count + 1,
      updated_at: new Date(),
    },
  });
  // Return transformed comment
  return await RedditCommunityCommentTransformer.transform(createdComment);
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
// export async function postRedditCommunityMemberPostsPostIdComments(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
//   body: IRedditCommunityComment.ICreate;
// }): Promise<IRedditCommunityComment> {
//   const record = await MyGlobal.prisma.reddit_community_comments.create({
//     data: await RedditCommunityCommentCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...RedditCommunityCommentTransformer.select(),
//   });
//   return await RedditCommunityCommentTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------