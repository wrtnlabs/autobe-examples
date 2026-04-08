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

export async function deleteRedditCloneMemberCommunitiesCommunityId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the community - must exist and not already deleted
  const community =
    await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: {
        id: true,
        reddit_clone_member_id: true,
        deleted_at: true,
        icon: {
          select: {
            id: true,
            reddit_clone_file_id: true,
          },
        },
      },
    });
  // Check if community is already deleted
  if (community.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  // Verify the requesting user is the owner
  if (community.reddit_clone_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Get current timestamp for soft delete
  const now = new Date();
  // Soft delete the community by setting deleted_at to current timestamp
  await MyGlobal.prisma.reddit_clone_communities.update({
    where: { id: props.communityId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
  // Schedule icon file for deletion after 30-day retention period if it exists
  if (community.icon !== null) {
    const retentionMs = 30 * 24 * 60 * 60 * 1000;
    const scheduledDeletion = new Date(Date.now() + retentionMs);
    await MyGlobal.prisma.reddit_clone_files.update({
      where: { id: community.icon.reddit_clone_file_id },
      data: {
        deleted_at: scheduledDeletion,
        updated_at: now,
      },
    });
  }
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
// export async function deleteRedditCloneMemberCommunitiesCommunityId(props: {
//   member: MemberPayload;
//   communityId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------