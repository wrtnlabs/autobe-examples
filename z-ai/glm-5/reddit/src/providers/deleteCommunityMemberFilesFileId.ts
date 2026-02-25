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

export async function deleteCommunityMemberFilesFileId(props: {
  member: MemberPayload;
  fileId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the file (throws 404 if not found or already deleted)
  const file = await MyGlobal.prisma.community_files.findUniqueOrThrow({
    where: {
      id: props.fileId,
      deleted_at: null,
    },
  });
  // Authorization check - only the owner can delete
  if (file.member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Soft delete by setting deleted_at timestamp
  await MyGlobal.prisma.community_files.update({
    where: { id: props.fileId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}
