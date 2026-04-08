import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformCommunityModeratorTransformer } from "../transformers/RedditPlatformCommunityModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformMemberCommunitiesCommunityNameModerators(props: {
  member: MemberPayload;
  communityName: string;
}): Promise<IRedditPlatformCommunityModerator[]> {
  const community =
    await MyGlobal.prisma.reddit_platform_communities.findUniqueOrThrow({
      where: {
        name: props.communityName,
        deleted_at: null,
      },
    });
  const moderators =
    await MyGlobal.prisma.reddit_platform_community_members.findMany({
      where: {
        community_id: community.id,
        role: "moderator",
        deleted_at: null,
      },
      ...RedditPlatformCommunityModeratorTransformer.select(),
      orderBy: {
        joined_at: "desc",
      },
    });
  const transformed = await ArrayUtil.asyncMap(
    moderators,
    RedditPlatformCommunityModeratorTransformer.transform,
  );
  return transformed;
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
// import { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditPlatformMemberCommunitiesCommunityNameModerators(props: {
//   member: MemberPayload;
//   communityName: string;
// }): Promise<IRedditPlatformCommunityModerator> {
//   const record = await MyGlobal.prisma.reddit_platform_community_members.findFirstOrThrow({
//     ...RedditPlatformCommunityModeratorTransformer.select(),
//     where: { ... },
//   });
//   return await RedditPlatformCommunityModeratorTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------