import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityPlatformMemberBansBanId(props: {
  member: MemberPayload;
  banId: string & tags.Format<"uuid">;
}): Promise<void> {
  const ban = await MyGlobal.prisma.community_platform_bans.findUnique({
    where: { id: props.banId },
    select: {
      id: true,
      community_platform_community_id: true,
    },
  });
  if (ban === null) {
    throw new HttpException("Ban not found", 404);
  }
  const communityId = ban.community_platform_community_id;
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: communityId },
      select: { owner_id: true },
    });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  if (community.owner_id !== props.member.id) {
    const moderator =
      await MyGlobal.prisma.community_platform_moderators.findFirst({
        where: {
          member_id: props.member.id,
          community_id: communityId,
        },
        select: { id: true },
      });
    if (moderator === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  await MyGlobal.prisma.community_platform_bans.delete({
    where: { id: props.banId },
  });
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteCommunityPlatformMemberBansBanId(props: {
//   member: MemberPayload;
//   banId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------