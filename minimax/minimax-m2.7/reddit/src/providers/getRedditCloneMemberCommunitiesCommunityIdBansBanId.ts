import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneCommunityBanTransformer } from "../transformers/RedditCloneCommunityBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneMemberCommunitiesCommunityIdBansBanId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneCommunityBan> {
  // Verify community exists
  await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
    where: { id: props.communityId },
    select: { id: true },
  });
  // Verify the requesting member has moderator or owner role in this community
  const moderator =
    await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
      where: {
        reddit_clone_community_id: props.communityId,
        reddit_clone_member_id: props.member.id,
      },
      select: {
        id: true,
        role: true,
      },
    });
  if (
    !moderator ||
    (moderator.role !== "owner" && moderator.role !== "moderator")
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Query the ban record by banId and verify it belongs to the specified community
  const record = await MyGlobal.prisma.reddit_clone_bans.findFirstOrThrow({
    ...RedditCloneCommunityBanTransformer.select(),
    where: {
      id: props.banId,
      reddit_clone_community_id: props.communityId,
    },
  });
  return await RedditCloneCommunityBanTransformer.transform(record);
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
// import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
// import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
// import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditCloneMemberCommunitiesCommunityIdBansBanId(props: {
//   member: MemberPayload;
//   communityId: string & tags.Format<"uuid">;
//   banId: string & tags.Format<"uuid">;
// }): Promise<IRedditCloneCommunityBan> {
//   const record = await MyGlobal.prisma.reddit_clone_bans.findFirstOrThrow({
//     ...RedditCloneCommunityBanTransformer.select(),
//     where: { ... },
//   });
//   return await RedditCloneCommunityBanTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------