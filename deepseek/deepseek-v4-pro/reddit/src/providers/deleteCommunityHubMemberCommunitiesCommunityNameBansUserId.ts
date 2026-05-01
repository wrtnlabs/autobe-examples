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

export async function deleteCommunityHubMemberCommunitiesCommunityNameBansUserId(props: {
  member: MemberPayload;
  communityName: string;
  userId: string & tags.Format<"uuid">;
}): Promise<void> {
  const community = await MyGlobal.prisma.community_hub_communities.findFirst({
    where: {
      name: { equals: props.communityName, mode: "insensitive" },
      deleted_at: null,
    },
    select: { id: true, member_id: true },
  });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  const ban = await MyGlobal.prisma.community_hub_community_bans.findFirst({
    where: {
      community_hub_community_id: community.id,
      community_hub_member_id: props.userId,
      unbanned_at: null,
    },
    select: { id: true },
  });
  if (ban === null) {
    throw new HttpException(
      "No active ban found for this user in this community",
      404,
    );
  }
  if (community.member_id !== props.member.id) {
    const moderatorRole =
      await MyGlobal.prisma.community_hub_community_moderators.findFirst({
        where: {
          community_hub_community_id: community.id,
          community_hub_member_id: props.member.id,
        },
        select: { id: true },
      });
    if (moderatorRole === null) {
      throw new HttpException(
        "You are not authorized to unban users in this community",
        403,
      );
    }
  }
  const now = new Date().toISOString();
  await MyGlobal.prisma.community_hub_community_bans.update({
    where: { id: ban.id },
    data: {
      unbanned_at: now,
      unbanned_by_id: props.member.id,
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
// export async function deleteCommunityHubMemberCommunitiesCommunityNameBansUserId(props: {
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