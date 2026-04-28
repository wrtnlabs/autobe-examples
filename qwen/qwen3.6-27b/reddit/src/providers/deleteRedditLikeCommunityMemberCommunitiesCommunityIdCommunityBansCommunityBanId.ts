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

export async function deleteRedditLikeCommunityMemberCommunitiesCommunityIdCommunityBansCommunityBanId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  communityBanId: string & tags.Format<"uuid">;
}): Promise<void> {
  const ban =
    await MyGlobal.prisma.reddit_like_community_community_bans.findUniqueOrThrow(
      {
        where: {
          id: props.communityBanId,
        },
        select: {
          id: true,
          reddit_like_community_community_id: true,
          deleted_at: true,
        },
      },
    );
  if (ban.reddit_like_community_community_id !== props.communityId) {
    throw new HttpException("Ban does not belong to this community", 403);
  }
  if (ban.deleted_at !== null) {
    throw new HttpException("Ban has already been removed", 400);
  }
  const moderatorRole =
    await MyGlobal.prisma.reddit_like_community_community_moderators.findFirst({
      where: {
        reddit_like_community_community_id: props.communityId,
        reddit_like_community_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        role: true,
      },
    });
  if (moderatorRole === null) {
    throw new HttpException(
      "Insufficient authorization to perform this action",
      403,
    );
  }
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.reddit_like_community_community_bans.update({
    where: {
      id: props.communityBanId,
    },
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
// export async function deleteRedditLikeCommunityMemberCommunitiesCommunityIdCommunityBansCommunityBanId(props: {
//   member: MemberPayload;
//   communityId: string & tags.Format<"uuid">;
//   communityBanId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------