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

export async function deleteCommunityPlatformMemberModeratorsModeratorId(props: {
  member: MemberPayload;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<void> {
  const moderator =
    await MyGlobal.prisma.community_platform_moderators.findUnique({
      where: { id: props.moderatorId },
      select: {
        id: true,
        role: true,
        community_id: true,
      },
    });
  if (moderator === null) {
    throw new HttpException("Moderator not found", 404);
  }
  if (moderator.role === "owner") {
    throw new HttpException("The community owner role cannot be removed", 403);
  }
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: moderator.community_id },
      select: {
        owner_id: true,
      },
    });
  if (community.owner_id !== props.member.id) {
    throw new HttpException(
      "Only the community owner can remove moderators",
      403,
    );
  }
  await MyGlobal.prisma.community_platform_moderators.delete({
    where: { id: props.moderatorId },
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
// export async function deleteCommunityPlatformMemberModeratorsModeratorId(props: {
//   member: MemberPayload;
//   moderatorId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------