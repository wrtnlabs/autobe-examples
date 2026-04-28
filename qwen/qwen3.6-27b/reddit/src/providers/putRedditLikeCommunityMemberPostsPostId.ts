import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { REdditLikeCommunityPostTransformer } from "../transformers/REdditLikeCommunityPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditLikeCommunityMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IREdditLikeCommunityPost.IUpdate;
}): Promise<IREdditLikeCommunityPost> {
  const post =
    await MyGlobal.prisma.reddit_like_community_posts.findUniqueOrThrow({
      where: { id: props.postId },
      select: {
        id: true,
        author_id: true,
        post_type: true,
        deleted_at: true,
      },
    });
  if (post.deleted_at !== null) {
    throw new HttpException("Gone", 410);
  }
  if (post.author_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (
    props.body.body !== undefined &&
    props.body.body !== null &&
    props.body.url !== undefined &&
    props.body.url !== null
  ) {
    throw new HttpException("Bad Request", 400);
  }
  if (
    post.post_type === "image" &&
    (props.body.body !== undefined || props.body.url !== undefined)
  ) {
    throw new HttpException("Bad Request", 400);
  }
  if (
    post.post_type === "text" &&
    props.body.url !== undefined &&
    props.body.url !== null
  ) {
    throw new HttpException("Bad Request", 400);
  }
  if (
    post.post_type === "link" &&
    props.body.body !== undefined &&
    props.body.body !== null
  ) {
    throw new HttpException("Bad Request", 400);
  }
  await MyGlobal.prisma.reddit_like_community_posts.update({
    where: { id: props.postId },
    data: {
      title: props.body.title,
      ...(props.body.body !== undefined && { body: props.body.body }),
      ...(props.body.url !== undefined && { url: props.body.url }),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.reddit_like_community_posts.findUniqueOrThrow({
      where: { id: props.postId },
      ...REdditLikeCommunityPostTransformer.select(),
    });
  return await REdditLikeCommunityPostTransformer.transform(updated);
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
// import { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
// import { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
// import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
// import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
// import { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putRedditLikeCommunityMemberPostsPostId(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
//   body: IREdditLikeCommunityPost.IUpdate;
// }): Promise<IREdditLikeCommunityPost> {
//   await MyGlobal.prisma.reddit_like_community_posts.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.reddit_like_community_posts.findUniqueOrThrow({
//     where: { ... },
//     ...REdditLikeCommunityPostTransformer.select(),
//   });
//   return await REdditLikeCommunityPostTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------