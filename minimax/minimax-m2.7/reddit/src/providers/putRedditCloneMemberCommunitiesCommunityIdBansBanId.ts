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
  // Verify member has moderator or owner permissions in the community
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
  if (!moderator) {
    throw new HttpException("Forbidden", 403);
  }
  // Fetch the ban record and verify it belongs to the community
  const existingBan = await MyGlobal.prisma.reddit_clone_bans.findUniqueOrThrow(
    {
      where: { id: props.banId },
      select: {
        id: true,
        reddit_clone_community_id: true,
        deleted_at: true,
      },
    },
  );
  // Verify ban belongs to specified community
  if (existingBan.reddit_clone_community_id !== props.communityId) {
    throw new HttpException("Ban does not belong to this community", 404);
  }
  // Verify ban is currently active (not already unbanned)
  if (existingBan.deleted_at !== null) {
    throw new HttpException("Ban is already lifted", 400);
  }
  // Update the ban - set deleted_at to unban the user
  const updatedBan = await MyGlobal.prisma.reddit_clone_bans.update({
    where: { id: props.banId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
      ...(props.body.reason !== undefined && { reason: props.body.reason }),
    },
    ...RedditCloneCommunityBanTransformer.select(),
  });
  return await RedditCloneCommunityBanTransformer.transform(updatedBan);
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