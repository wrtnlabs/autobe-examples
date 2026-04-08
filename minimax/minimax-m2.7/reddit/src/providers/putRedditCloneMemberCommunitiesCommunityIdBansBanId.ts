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

export async function putRedditCloneMemberCommunitiesCommunityIdBansBanId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
  body: IRedditCloneCommunityBan.IUpdate;
}): Promise<IRedditCloneCommunityBan> {
  // 1. Authorization: Verify the authenticated user has moderator or owner role
  const moderator =
    await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
      where: {
        reddit_clone_member_id: props.member.id,
        reddit_clone_community_id: props.communityId,
        role: { in: ["owner", "moderator"] },
      },
      select: {
        id: true,
      },
    });
  if (moderator === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Retrieve ban record and verify it belongs to the specified community
  const ban = await MyGlobal.prisma.reddit_clone_bans.findUnique({
    where: { id: props.banId },
    select: {
      id: true,
      reddit_clone_community_id: true,
      deleted_at: true,
    },
  });
  if (ban === null) {
    throw new HttpException("Not Found", 404);
  }
  if (ban.reddit_clone_community_id !== props.communityId) {
    throw new HttpException("Ban does not belong to this community", 400);
  }
  // 3. Verify the ban is currently active (not already unbanned)
  if (ban.deleted_at !== null) {
    throw new HttpException("Ban is already lifted", 400);
  }
  // 4. Lift the ban by setting deleted_at and updated_at timestamps
  const now = new Date();
  await MyGlobal.prisma.reddit_clone_bans.update({
    where: { id: props.banId },
    data: {
      deleted_at: now,
      updated_at: now,
      ...(props.body.reason !== undefined && { reason: props.body.reason }),
    },
  });
  // 5. Return the updated ban record with all relations loaded
  const updated = await MyGlobal.prisma.reddit_clone_bans.findUniqueOrThrow({
    where: { id: props.banId },
    ...RedditCloneCommunityBanTransformer.select(),
  });
  return await RedditCloneCommunityBanTransformer.transform(updated);
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
// export async function putRedditCloneMemberCommunitiesCommunityIdBansBanId(props: {
//   member: MemberPayload;
//   communityId: string & tags.Format<"uuid">;
//   banId: string & tags.Format<"uuid">;
//   body: IRedditCloneCommunityBan.IUpdate;
// }): Promise<IRedditCloneCommunityBan> {
//   await MyGlobal.prisma.reddit_clone_bans.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.reddit_clone_bans.findUniqueOrThrow({
//     where: { ... },
//     ...RedditCloneCommunityBanTransformer.select(),
//   });
//   return await RedditCloneCommunityBanTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------