import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditClonePostLinkTransformer } from "../transformers/RedditClonePostLinkTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCloneMemberPostsPostIdLink(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditClonePostLink.IUpdate;
}): Promise<IRedditClonePostLink> {
  // 1. Validate post exists and is of type 'link'
  const post = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: {
      id: true,
      reddit_clone_member_id: true,
      type: true,
      deleted_at: true,
    },
  });
  // 2. Verify post is not deleted
  if (post.deleted_at !== null) {
    throw new HttpException("Post not found", 404);
  }
  // 3. Verify post is of type 'link'
  if (post.type !== "link") {
    throw new HttpException(
      "Post type mismatch - this endpoint is only for link posts",
      400,
    );
  }
  // 4. Verify authenticated member is the author
  if (post.reddit_clone_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 5. Update the link URL
  await MyGlobal.prisma.reddit_clone_post_links.update({
    where: { reddit_clone_post_id: props.postId },
    data: {
      url: props.body.url,
      updated_at: new Date(),
    },
  });
  // 6. Return updated link entity
  const updated =
    await MyGlobal.prisma.reddit_clone_post_links.findUniqueOrThrow({
      where: { reddit_clone_post_id: props.postId },
      ...RedditClonePostLinkTransformer.select(),
    });
  return await RedditClonePostLinkTransformer.transform(updated);
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
// import { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
// import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
// import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
// import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putRedditCloneMemberPostsPostIdLink(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
//   body: IRedditClonePostLink.IUpdate;
// }): Promise<IRedditClonePostLink> {
//   await MyGlobal.prisma.reddit_clone_post_links.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.reddit_clone_post_links.findUniqueOrThrow({
//     where: { ... },
//     ...RedditClonePostLinkTransformer.select(),
//   });
//   return await RedditClonePostLinkTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------