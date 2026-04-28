import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import { IRedditLikeCommunityPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikeCommunityPostCommentCollector } from "../collectors/RedditLikeCommunityPostCommentCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeCommunityPostCommentTransformer } from "../transformers/RedditLikeCommunityPostCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeCommunityMemberPostsPostIdComments(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditLikeCommunityPostComment.ICreate;
}): Promise<IRedditLikeCommunityPostComment> {
  const post =
    await MyGlobal.prisma.reddit_like_community_posts.findUniqueOrThrow({
      where: {
        id: props.postId,
        deleted_at: null,
      },
      select: {
        id: true,
        community_id: true,
      },
    });
  const banCount =
    await MyGlobal.prisma.reddit_like_community_community_bans.count({
      where: {
        reddit_like_community_community_id: post.community_id,
        member_id: props.member.id,
        deleted_at: null,
      },
    });
  if (banCount > 0) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.parentCommentId != null) {
    const parentComment =
      await MyGlobal.prisma.reddit_like_community_post_comments.findUniqueOrThrow(
        {
          where: {
            id: props.body.parentCommentId,
            deleted_at: null,
          },
          select: {
            id: true,
            reddit_like_community_post_id: true,
          },
        },
      );
    if (parentComment.reddit_like_community_post_id !== props.postId) {
      throw new HttpException(
        "Parent comment does not belong to this post",
        400,
      );
    }
  }
  const created =
    await MyGlobal.prisma.reddit_like_community_post_comments.create({
      data: await RedditLikeCommunityPostCommentCollector.collect({
        body: props.body,
        redditLikeCommunityPosts: { id: post.id },
        redditLikeCommunityMembers: { id: props.member.id },
      }),
      ...RedditLikeCommunityPostCommentTransformer.select(),
    });
  return await RedditLikeCommunityPostCommentTransformer.transform(created);
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
// import { IRedditLikeCommunityPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostComment";
// import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
// import { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
// import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditLikeCommunityMemberPostsPostIdComments(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
//   body: IRedditLikeCommunityPostComment.ICreate;
// }): Promise<IRedditLikeCommunityPostComment> {
//   const record = await MyGlobal.prisma.reddit_like_community_post_comments.create({
//     data: await RedditLikeCommunityPostCommentCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...RedditLikeCommunityPostCommentTransformer.select(),
//   });
//   return await RedditLikeCommunityPostCommentTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------