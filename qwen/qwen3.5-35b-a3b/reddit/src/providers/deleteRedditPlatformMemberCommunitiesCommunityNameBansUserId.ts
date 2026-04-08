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

export async function deleteRedditPlatformMemberCommunitiesCommunityNameBansUserId(props: {
  member: MemberPayload;
  communityName: string;
  userId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the community by name
  const community = await MyGlobal.prisma.reddit_platform_communities.findFirst(
    {
      where: { name: props.communityName, deleted_at: null },
      select: { id: true },
    },
  );
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  // Find the ban record
  const banRecord =
    await MyGlobal.prisma.reddit_platform_banned_users.findFirst({
      where: {
        user_id: props.userId,
        community_id: community.id,
        deleted_at: null,
      },
      include: {
        user: { select: { id: true } },
        community: { select: { id: true } },
        bannedBy: { select: { id: true } },
      },
    });
  if (banRecord === null) {
    throw new HttpException("Ban record not found", 404);
  }
  // Check if already unbanned
  if (banRecord.unbanned_at !== null) {
    throw new HttpException("User is already unbanned", 409);
  }
  // Verify authorization: requester must be community owner or moderator
  const membership =
    await MyGlobal.prisma.reddit_platform_community_members.findFirst({
      where: {
        user_id: props.member.id,
        community_id: community.id,
        deleted_at: null,
      },
      select: { role: true },
    });
  if (membership === null) {
    throw new HttpException("Forbidden", 403);
  }
  if (membership.role !== "owner" && membership.role !== "moderator") {
    throw new HttpException("Forbidden", 403);
  }
  // Update ban record to unbanned
  await MyGlobal.prisma.reddit_platform_banned_users.update({
    where: { id: banRecord.id },
    data: {
      unbanned_at: new Date(),
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
// export async function deleteRedditPlatformMemberCommunitiesCommunityNameBansUserId(props: {
//   member: MemberPayload;
//   communityName: string;
//   userId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------