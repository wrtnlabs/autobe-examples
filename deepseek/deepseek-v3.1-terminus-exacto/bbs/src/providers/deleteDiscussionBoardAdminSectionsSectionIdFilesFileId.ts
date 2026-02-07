import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardAdminSectionsSectionIdFilesFileId(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
  fileId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First verify that the section exists
  const section = await MyGlobal.prisma.discussion_board_sections.findFirst({
    where: {
      id: props.sectionId,
      deleted_at: null,
    },
  });
  if (!section) {
    throw new HttpException("Section not found", 404);
  }
  // Verify the file exists and belongs to the specified section
  const file = await MyGlobal.prisma.discussion_board_section_files.findFirst({
    where: {
      id: props.fileId,
      discussion_board_section_id: props.sectionId,
      deleted_at: null,
    },
  });
  if (!file) {
    throw new HttpException("File not found or already deleted", 404);
  }
  // Get current timestamp as ISO string
  const currentTimestamp = toISOStringSafe(new Date());
  // Perform soft deletion by setting deleted_at timestamp
  await MyGlobal.prisma.discussion_board_section_files.update({
    where: { id: props.fileId },
    data: {
      deleted_at: currentTimestamp,
      updated_at: currentTimestamp,
    },
  });
}
