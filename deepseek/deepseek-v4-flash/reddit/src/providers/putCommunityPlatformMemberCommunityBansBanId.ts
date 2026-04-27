import { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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
import { CommunityPlatformBanTransformer } from "../transformers/CommunityPlatformBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformMemberCommunityBansBanId(props: {
  member: MemberPayload;
  banId: string & tags.Format<"uuid">;
  body: ICommunityPlatformBan.IUpdate;
}): Promise<ICommunityPlatformBan> {
  // 1. Fetch the ban record (404 if not found)
  const ban = await MyGlobal.prisma.community_platform_bans.findUniqueOrThrow({
    where: { id: props.banId },
    select: {
      id: true,
      community_platform_community_id: true,
    },
  });
  // 2. Verify the requesting member is a moderator or owner of the ban's community
  const moderator =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        member_id: props.member.id,
        community_id: ban.community_platform_community_id,
        role: { in: ["owner", "moderator"] },
      },
    });
  if (moderator === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Update the reason field if provided, always update updated_at
  await MyGlobal.prisma.community_platform_bans.update({
    where: { id: props.banId },
    data: {
      ...(props.body.reason !== undefined && { reason: props.body.reason }),
      updated_at: new Date().toISOString(),
    },
  });
  // 4. Fetch the complete updated record with transformer
  const updated =
    await MyGlobal.prisma.community_platform_bans.findUniqueOrThrow({
      where: { id: props.banId },
      ...CommunityPlatformBanTransformer.select(),
    });
  // 5. Return transformed response
  return await CommunityPlatformBanTransformer.transform(updated);
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
// import { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
// import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
// import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putCommunityPlatformMemberCommunityBansBanId(props: {
//   member: MemberPayload;
//   banId: string & tags.Format<"uuid">;
//   body: ICommunityPlatformBan.IUpdate;
// }): Promise<ICommunityPlatformBan> {
//   await MyGlobal.prisma.community_platform_bans.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.community_platform_bans.findUniqueOrThrow({
//     where: { ... },
//     ...CommunityPlatformBanTransformer.select(),
//   });
//   return await CommunityPlatformBanTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------