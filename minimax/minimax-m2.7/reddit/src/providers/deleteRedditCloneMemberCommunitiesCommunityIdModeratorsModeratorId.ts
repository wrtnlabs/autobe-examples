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
  // Step 1: Authorization - Verify the current member is the owner of the community
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
  if (ownerRecord === null) {
    throw new HttpException("Only the owner can remove moderators", 403);
  }
  // Step 2: Target Validation - Find the moderator to remove
  const moderatorRecord =
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
  if (moderatorRecord === null) {
    throw new HttpException("Moderator not found", 404);
  }
  // Step 3: Owner Protection - Cannot remove the owner
  if (moderatorRecord.role === "owner") {
    throw new HttpException("The owner cannot be removed", 400);
  }
  // Step 4: Hard Delete - Remove the moderator assignment
  await MyGlobal.prisma.reddit_clone_community_moderators.delete({
    where: {
      id: moderatorRecord.id,
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