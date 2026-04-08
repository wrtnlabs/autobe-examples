import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import { IRedditPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostLink";
import { IRedditPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostText";
import { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformPostCollector } from "../collectors/RedditPlatformPostCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformPostTransformer } from "../transformers/RedditPlatformPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformMemberPosts(props: {
  member: MemberPayload;
  body: IRedditPlatformPost.ICreate;
}): Promise<IRedditPlatformPost> {
  const { member, body } = props;
  if (body.title === undefined || body.title.length === 0) {
    throw new HttpException("Title is required", 400);
  }
  if (
    body.post_type !== "text" &&
    body.post_type !== "link" &&
    body.post_type !== "image"
  ) {
    throw new HttpException("Invalid post_type", 400);
  }
  if (body.post_type === "text" && body.text_content === undefined) {
    throw new HttpException("text_content is required for text posts", 400);
  }
  if (body.post_type === "link" && body.url === undefined) {
    throw new HttpException("url is required for link posts", 400);
  }
  if (body.post_type === "image" && body.image_url === undefined) {
    throw new HttpException("image_url is required for image posts", 400);
  }
  const community =
    await MyGlobal.prisma.reddit_platform_communities.findUnique({
      where: {
        id: body.community_id,
        deleted_at: null,
      },
    });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  const record = await MyGlobal.prisma.reddit_platform_posts.create({
    data: await RedditPlatformPostCollector.collect({
      body,
      redditPlatformMembers: {
        id: member.id,
      },
    }),
    ...RedditPlatformPostTransformer.select(),
  });
  return await RedditPlatformPostTransformer.transform(record);
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
// import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
// import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
// import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
// import { IRedditPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostText";
// import { IRedditPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostLink";
// import { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
// import { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
// import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditPlatformMemberPosts(props: {
//   member: MemberPayload;
//   body: IRedditPlatformPost.ICreate;
// }): Promise<IRedditPlatformPost> {
//   const record = await MyGlobal.prisma.reddit_platform_posts.create({
//     data: await RedditPlatformPostCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...RedditPlatformPostTransformer.select(),
//   });
//   return await RedditPlatformPostTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------