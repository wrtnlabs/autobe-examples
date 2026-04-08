import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBanRecord";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditCommunityBanRecordTransformer } from "../transformers/RedditCommunityBanRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityAdminBansBanId(props: {
  admin: AdminPayload;
  banId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityBanRecord> {
  const record =
    await MyGlobal.prisma.reddit_community_ban_records.findUniqueOrThrow({
      ...RedditCommunityBanRecordTransformer.select(),
      where: {
        id: props.banId,
        deleted_at: null,
      },
    });
  const hasPermission =
    await MyGlobal.prisma.reddit_community_moderator_roles.findFirst({
      select: { id: true },
      where: {
        community: { id: record.community.id },
        reddit_community_member_id: props.admin.id,
        deleted_at: null,
      },
    });
  if (hasPermission === null) {
    throw new HttpException("Forbidden", 403);
  }
  return await RedditCommunityBanRecordTransformer.transform(record);
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
// import { IRedditCommunityBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBanRecord";
// import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
// import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditCommunityAdminBansBanId(props: {
//   admin: AdminPayload;
//   banId: string & tags.Format<"uuid">;
// }): Promise<IRedditCommunityBanRecord> {
//   const record = await MyGlobal.prisma.reddit_community_ban_records.findFirstOrThrow({
//     ...RedditCommunityBanRecordTransformer.select(),
//     where: { ... },
//   });
//   return await RedditCommunityBanRecordTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------