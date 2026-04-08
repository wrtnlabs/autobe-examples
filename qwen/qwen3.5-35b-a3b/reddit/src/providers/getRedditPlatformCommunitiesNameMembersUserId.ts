import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformCommunityMemberTransformer } from "../transformers/RedditPlatformCommunityMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformCommunitiesNameMembersUserId(props: {
  name: string;
  userId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformCommunityMember> {
  const community =
    await MyGlobal.prisma.reddit_platform_communities.findFirstOrThrow({
      where: { name: props.name },
      select: { id: true },
    });
  const record =
    await MyGlobal.prisma.reddit_platform_community_members.findFirstOrThrow({
      ...RedditPlatformCommunityMemberTransformer.select(),
      where: {
        community_id: community.id,
        user_id: props.userId,
      },
    });
  return await RedditPlatformCommunityMemberTransformer.transform(record);
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
// import { IRedditPlatformCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditPlatformCommunitiesNameMembersUserId(props: {
//   name: string;
//   userId: string & tags.Format<"uuid">;
// }): Promise<IRedditPlatformCommunityMember> {
//   const record = await MyGlobal.prisma.reddit_platform_community_members.findFirstOrThrow({
//     ...RedditPlatformCommunityMemberTransformer.select(),
//     where: { ... },
//   });
//   return await RedditPlatformCommunityMemberTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------