import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardSuperAdminSectionsSectionIdFilesFileId(props: {
  superAdmin: SuperAdminPayload;
  sectionId: string & tags.Format<"uuid">;
  fileId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First verify the section exists, was created by this super admin, and is not deleted
  await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
    where: {
      id: props.sectionId,
      created_by_admin_id: props.superAdmin.id,
      deleted_at: null,
    },
  });
  // Verify the file exists and belongs to the section
  await MyGlobal.prisma.discussion_board_section_files.findUniqueOrThrow({
    where: {
      id: props.fileId,
      discussion_board_section_id: props.sectionId,
      deleted_at: null,
    },
  });
  // Perform soft deletion with proper ISO string timestamps
  const now = new Date().toISOString();
  await MyGlobal.prisma.discussion_board_section_files.update({
    where: { id: props.fileId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
