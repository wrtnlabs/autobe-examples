import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { RedditCommunityPostTransformer } from "../transformers/RedditCommunityPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCommunityMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityPost.IUpdate;
}): Promise<IRedditCommunityPost> {
  // Step 1: Validate post exists and check authorship
  const existingPost =
    await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
      where: { id: props.postId },
      select: {
        id: true,
        reddit_community_member_id: true,
        deleted_at: true,
      },
    });
  // Validate authorship
  if (existingPost.reddit_community_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate post is not soft-deleted
  if (existingPost.deleted_at !== null) {
    throw new HttpException("Post is already deleted", 400);
  }
  // Step 2: Build update data - only editable fields
  const updateData: {
    title?: string;
    text_content?: string | null;
    link_url?: (string & tags.Format<"uri">) | null;
    post_type?: string;
    updated_at: string & tags.Format<"date-time">;
  } = {
    updated_at: toISOStringSafe(new Date()),
  };
  if (props.body.title !== undefined) {
    updateData.title = props.body.title;
  }
  if (props.body.text_content !== undefined) {
    updateData.text_content = props.body.text_content ?? null;
  }
  if (props.body.link_url !== undefined) {
    updateData.link_url = typia.assert<(string & tags.Format<"uri">) | null>(
      props.body.link_url ?? null,
    );
  }
  if (props.body.post_type !== undefined) {
    updateData.post_type = props.body.post_type;
  }
  // Step 3: Execute update
  await MyGlobal.prisma.reddit_community_posts.update({
    where: { id: props.postId },
    data: updateData,
  });
  // Step 4: Fetch updated post with relations using transformer
  const updated =
    await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
      where: { id: props.postId },
      ...RedditCommunityPostTransformer.select(),
    });
  // Step 5: Transform and return
  return await RedditCommunityPostTransformer.transform(updated);
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
// import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
// import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
// import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putRedditCommunityMemberPostsPostId(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
//   body: IRedditCommunityPost.IUpdate;
// }): Promise<IRedditCommunityPost> {
//   await MyGlobal.prisma.reddit_community_posts.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
//     where: { ... },
//     ...RedditCommunityPostTransformer.select(),
//   });
//   return await RedditCommunityPostTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------