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

export async function deleteRedditPlatformMemberBansBanId(props: {
  member: MemberPayload;
  banId: string & tags.Format<"uuid">;
}): Promise<void> {
  const ban =
    await MyGlobal.prisma.reddit_platform_ban_records.findUniqueOrThrow({
      where: { id: props.banId },
      select: {
        id: true,
        community_id: true,
        user_id: true,
        banned_by: true,
        unbanned_at: true,
        deleted_at: true,
        community: {
          select: {
            id: true,
            owner_id: true,
          },
        },
      },
    });
  // Validate ban is not soft-deleted
  if (ban.deleted_at !== null) {
    throw new HttpException("Ban record not found", 404);
  }
  // Validate ban is currently active (not already unbanned)
  if (ban.unbanned_at !== null) {
    throw new HttpException("Ban is already unbanned", 409);
  }
  // Verify authorization - check if requesting user is community owner or moderator
  const isOwner = ban.community.owner_id === props.member.id;
  let isModerator = false;
  if (!isOwner) {
    const membership =
      await MyGlobal.prisma.reddit_platform_community_members.findFirst({
        where: {
          community_id: ban.community_id,
          user_id: props.member.id,
          role: "moderator",
          deleted_at: null,
        },
      });
    isModerator = membership !== null;
  }
  if (!isOwner && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  // Perform soft-unban by setting unbanned_at timestamp
  await MyGlobal.prisma.reddit_platform_ban_records.update({
    where: { id: props.banId },
    data: {
      unbanned_at: new Date(),
      updated_at: new Date(),
    },
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
// export async function deleteRedditPlatformMemberBansBanId(props: {
//   member: MemberPayload;
//   banId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------