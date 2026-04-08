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

export async function deleteRedditCloneMemberFilesFileId(props: {
  member: MemberPayload;
  fileId: string & tags.Format<"uuid">;
}): Promise<void> {
  const file = await MyGlobal.prisma.reddit_clone_files.findUnique({
    where: { id: props.fileId },
    select: {
      id: true,
      uploader_id: true,
      deleted_at: true,
    },
  });
  if (!file || file.deleted_at !== null) {
    throw new HttpException("File not found", 404);
  }
  const isUploader = file.uploader_id === props.member.id;
  let isModerator = false;
  if (!isUploader) {
    const associations =
      await MyGlobal.prisma.reddit_clone_file_associations.findMany({
        where: { reddit_clone_file_id: props.fileId },
        select: {
          target_type: true,
          target_id: true,
        },
      });
    if (associations.length > 0) {
      const postIds = associations
        .filter((a) => a.target_type === "post")
        .map((a) => a.target_id);
      if (postIds.length > 0) {
        const posts = await MyGlobal.prisma.reddit_clone_posts.findMany({
          where: { id: { in: postIds } },
          select: { reddit_clone_community_id: true },
        });
        const communityIds = [
          ...new Set(posts.map((p) => p.reddit_clone_community_id)),
        ];
        if (communityIds.length > 0) {
          const moderator =
            await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
              where: {
                reddit_clone_community_id: { in: communityIds },
                reddit_clone_member_id: props.member.id,
              },
            });
          isModerator = moderator !== null;
        }
      }
    }
  }
  if (!isUploader && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  const now = new Date();
  await MyGlobal.prisma.reddit_clone_files.update({
    where: { id: props.fileId },
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
// export async function deleteRedditCloneMemberFilesFileId(props: {
//   member: MemberPayload;
//   fileId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------