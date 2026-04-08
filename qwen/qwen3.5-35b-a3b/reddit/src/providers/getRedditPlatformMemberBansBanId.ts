import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBanRecord";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformBanRecordTransformer } from "../transformers/RedditPlatformBanRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformMemberBansBanId(props: {
  member: MemberPayload;
  banId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformBanRecord> {
  const record =
    await MyGlobal.prisma.reddit_platform_ban_records.findUniqueOrThrow({
      ...RedditPlatformBanRecordTransformer.select(),
      where: {
        id: props.banId,
        deleted_at: null,
      },
    });
  const isBannedUser = record.user.id === props.member.id;
  const isCommunityOwner = record.community.owner.id === props.member.id;
  const isBannedBySelf = record.bannedBy.id === props.member.id;
  if (!isBannedUser && !isCommunityOwner && !isBannedBySelf) {
    throw new HttpException("Forbidden", 403);
  }
  return await RedditPlatformBanRecordTransformer.transform(record);
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
// import { IRedditPlatformBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBanRecord";
// import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
// import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditPlatformMemberBansBanId(props: {
//   member: MemberPayload;
//   banId: string & tags.Format<"uuid">;
// }): Promise<IRedditPlatformBanRecord> {
//   const record = await MyGlobal.prisma.reddit_platform_ban_records.findFirstOrThrow({
//     ...RedditPlatformBanRecordTransformer.select(),
//     where: { ... },
//   });
//   return await RedditPlatformBanRecordTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------