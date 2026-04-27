import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommunityBanTransformer } from "../transformers/CommunityPlatformCommunityBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformMemberCommunityBansBanId(props: {
  member: MemberPayload;
  banId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunityBan> {
  const ban =
    await MyGlobal.prisma.community_platform_community_bans.findUniqueOrThrow({
      where: { id: props.banId },
      select: { id: true, community_platform_community_id: true },
    });
  const communityId = ban.community_platform_community_id;
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: communityId },
      select: { owner_id: true },
    });
  if (community.owner_id !== props.member.id) {
    const moderator =
      await MyGlobal.prisma.community_platform_moderators.findFirst({
        where: {
          community_id: communityId,
          member_id: props.member.id,
        },
        select: { id: true },
      });
    if (moderator === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  const record =
    await MyGlobal.prisma.community_platform_community_bans.findUniqueOrThrow({
      where: { id: props.banId },
      ...CommunityPlatformCommunityBanTransformer.select(),
    });
  return await CommunityPlatformCommunityBanTransformer.transform(record);
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
// import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
// import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
// import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getCommunityPlatformMemberCommunityBansBanId(props: {
//   member: MemberPayload;
//   banId: string & tags.Format<"uuid">;
// }): Promise<ICommunityPlatformCommunityBan> {
//   const record = await MyGlobal.prisma.community_platform_community_bans.findFirstOrThrow({
//     ...CommunityPlatformCommunityBanTransformer.select(),
//     where: { ... },
//   });
//   return await CommunityPlatformCommunityBanTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------