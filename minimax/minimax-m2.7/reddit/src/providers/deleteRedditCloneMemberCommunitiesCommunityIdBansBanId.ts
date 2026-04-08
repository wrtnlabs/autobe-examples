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

export async function deleteRedditCloneMemberCommunitiesCommunityIdBansBanId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Verify the ban exists and belongs to the specified community
  const ban = await MyGlobal.prisma.reddit_clone_bans.findUnique({
    where: { id: props.banId },
    select: {
      id: true,
      reddit_clone_community_id: true,
      deleted_at: true,
    },
  });
  if (!ban) {
    throw new HttpException("Ban not found", 404);
  }
  // Step 2: Verify the ban belongs to the specified community
  if (ban.reddit_clone_community_id !== props.communityId) {
    throw new HttpException("Ban not found", 404);
  }
  // Step 3: Verify the ban is currently active (not already unbanned)
  if (ban.deleted_at !== null) {
    throw new HttpException("Ban not found", 404);
  }
  // Step 4: Check if requesting member has moderator privileges in the community
  const moderatorRecord =
    await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
      where: {
        reddit_clone_community_id: props.communityId,
        reddit_clone_member_id: props.member.id,
        role: { in: ["owner", "moderator"] },
      },
      select: {
        id: true,
        role: true,
      },
    });
  if (!moderatorRecord) {
    throw new HttpException(
      "You do not have permission to unban users in this community",
      403,
    );
  }
  // Step 5: Soft-delete the ban by setting deleted_at to current timestamp
  const now = new Date();
  await MyGlobal.prisma.reddit_clone_bans.update({
    where: { id: props.banId },
    data: {
      deleted_at: now,
      updated_at: now,
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
// export async function deleteRedditCloneMemberCommunitiesCommunityIdBansBanId(props: {
//   member: MemberPayload;
//   communityId: string & tags.Format<"uuid">;
//   banId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------