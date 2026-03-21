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
  // Find the file and verify it exists and is not already deleted
  const file = await MyGlobal.prisma.reddit_clone_files.findFirst({
    where: {
      id: props.fileId,
      deleted_at: null,
    },
    select: {
      id: true,
      uploader_id: true,
    },
  });
  if (file === null) {
    throw new HttpException("Not Found", 404);
  }
  // Verify the authenticated member is the uploader
  if (file.uploader_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Soft delete the file and delete associated thumbnails in a transaction
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.reddit_clone_files.update({
      where: { id: props.fileId },
      data: {
        deleted_at: new Date(),
      },
    }),
    MyGlobal.prisma.reddit_clone_file_thumbnails.deleteMany({
      where: {
        reddit_clone_file_id: props.fileId,
      },
    }),
  ]);
}
