import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityPostCollector } from "../collectors/RedditCommunityPostCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityPostTransformer } from "../transformers/RedditCommunityPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityMemberPosts(props: {
  member: MemberPayload;
  body: IRedditCommunityPost.ICreate;
}): Promise<IRedditCommunityPost> {
  const {
    title,
    post_type,
    reddit_community_community_id,
    text_content,
    link_url,
  } = props.body;
  if (title.length === 0) {
    throw new HttpException("Title cannot be empty", 400);
  }
  if (post_type === "text" && text_content === undefined) {
    throw new HttpException("Text content is required for text posts", 400);
  }
  if (post_type === "link" && link_url === undefined) {
    throw new HttpException("Link URL is required for link posts", 400);
  }
  const subscription =
    await MyGlobal.prisma.reddit_community_subscriptions.findFirst({
      where: {
        reddit_community_member_id: props.member.id,
        reddit_community_communities_id: reddit_community_community_id,
        deleted_at: null,
      },
    });
  if (subscription === null) {
    throw new HttpException(
      "You must be subscribed to this community to post",
      403,
    );
  }
  const record = await MyGlobal.prisma.reddit_community_posts.create({
    data: await RedditCommunityPostCollector.collect({
      body: props.body,
      redditCommunityMembers: { id: props.member.id },
    }),
    ...RedditCommunityPostTransformer.select(),
  });
  return await RedditCommunityPostTransformer.transform(record);
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
// import { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
// import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
// import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditCommunityMemberPosts(props: {
//   member: MemberPayload;
//   body: IRedditCommunityPost.ICreate;
// }): Promise<IRedditCommunityPost> {
//   const record = await MyGlobal.prisma.reddit_community_posts.create({
//     data: await RedditCommunityPostCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...RedditCommunityPostTransformer.select(),
//   });
//   return await RedditCommunityPostTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------