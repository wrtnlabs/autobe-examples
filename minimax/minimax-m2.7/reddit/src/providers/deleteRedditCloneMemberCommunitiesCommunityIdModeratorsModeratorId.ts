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

export async function deleteRedditCloneMemberCommunitiesCommunityIdModeratorsModeratorId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Authorization Check: Verify the authenticated user is the owner of the community
  const ownerRecord =
    await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
      where: {
        reddit_clone_community_id: props.communityId,
        reddit_clone_member_id: props.member.id,
        role: "owner",
      },
      select: {
        id: true,
      },
    });
  if (!ownerRecord) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Target Validation: Query the moderator record to be removed
  const targetModerator =
    await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
      where: {
        reddit_clone_community_id: props.communityId,
        reddit_clone_member_id: props.moderatorId,
      },
      select: {
        id: true,
        role: true,
      },
    });
  if (!targetModerator) {
    throw new HttpException("Moderator not found", 404);
  }
  // 3. Owner Protection: Verify the target moderator's role is NOT 'owner'
  if (targetModerator.role === "owner") {
    throw new HttpException("Cannot remove the owner", 400);
  }
  // 4. Hard Delete: Remove the moderator record
  await MyGlobal.prisma.reddit_clone_community_moderators.delete({
    where: {
      id: targetModerator.id,
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
// export async function deleteRedditCloneMemberCommunitiesCommunityIdModeratorsModeratorId(props: {
//   member: MemberPayload;
//   communityId: string & tags.Format<"uuid">;
//   moderatorId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------