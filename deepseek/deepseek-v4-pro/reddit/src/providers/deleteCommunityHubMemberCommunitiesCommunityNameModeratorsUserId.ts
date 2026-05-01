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

export async function deleteCommunityHubMemberCommunitiesCommunityNameModeratorsUserId(props: {
  member: MemberPayload;
  communityName: string;
  userId: string & tags.Format<"uuid">;
}): Promise<void> {
  const community = await MyGlobal.prisma.community_hub_communities.findFirst({
    where: {
      name: { equals: props.communityName, mode: "insensitive" },
      deleted_at: null,
    },
    select: { id: true },
  });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  const ownerRecord =
    await MyGlobal.prisma.community_hub_community_moderators.findFirst({
      where: {
        community_hub_community_id: community.id,
        community_hub_member_id: props.member.id,
        role: "owner",
      },
      select: { id: true },
    });
  if (ownerRecord === null) {
    throw new HttpException("Forbidden", 403);
  }
  const targetRecord =
    await MyGlobal.prisma.community_hub_community_moderators.findFirst({
      where: {
        community_hub_community_id: community.id,
        community_hub_member_id: props.userId,
      },
      select: { id: true, role: true },
    });
  if (targetRecord === null) {
    return;
  }
  if (targetRecord.role === "owner") {
    throw new HttpException(
      "Owner cannot remove themselves from the moderator list",
      422,
    );
  }
  await MyGlobal.prisma.community_hub_community_moderators.delete({
    where: { id: targetRecord.id },
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
// export async function deleteCommunityHubMemberCommunitiesCommunityNameModeratorsUserId(props: {
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