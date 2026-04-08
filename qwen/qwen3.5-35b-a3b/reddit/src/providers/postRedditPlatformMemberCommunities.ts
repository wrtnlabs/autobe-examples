import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformCommunityCollector } from "../collectors/RedditPlatformCommunityCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformCommunityTransformer } from "../transformers/RedditPlatformCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformMemberCommunities(props: {
  member: MemberPayload;
  body: IRedditPlatformCommunity.ICreate;
}): Promise<IRedditPlatformCommunity> {
  const record = await MyGlobal.prisma.reddit_platform_communities.create({
    data: await RedditPlatformCommunityCollector.collect({
      body: props.body,
      redditPlatformMembers: { id: props.member.id },
    }),
    ...RedditPlatformCommunityTransformer.select(),
  });
  return await RedditPlatformCommunityTransformer.transform(record);
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
// import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
// import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditPlatformMemberCommunities(props: {
//   member: MemberPayload;
//   body: IRedditPlatformCommunity.ICreate;
// }): Promise<IRedditPlatformCommunity> {
//   const record = await MyGlobal.prisma.reddit_platform_communities.create({
//     data: await RedditPlatformCommunityCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...RedditPlatformCommunityTransformer.select(),
//   });
//   return await RedditPlatformCommunityTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------