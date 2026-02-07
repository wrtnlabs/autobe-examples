import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardSuperAdminSectionsSectionIdFilesFileId(props: {
  superAdmin: SuperadminPayload;
  sectionId: string & tags.Format<"uuid">;
  fileId: string & tags.Format<"uuid">;
}): Promise<void> {
  try {
    // Verify the file exists and belongs to the specified section
    const file = await MyGlobal.prisma.discussion_board_section_files.findFirst(
      {
        where: {
          id: props.fileId,
          discussion_board_section_id: props.sectionId,
          deleted_at: null,
        },
      },
    );
    if (!file) {
      throw new HttpException(
        "File not found or does not belong to the specified section",
        404,
      );
    }
    // Perform hard deletion
    await MyGlobal.prisma.discussion_board_section_files.delete({
      where: {
        id: props.fileId,
      },
    });
    // Note: Physical file removal from storage would require additional
    // file system operations and is beyond the scope of this database operation
    // This should be handled by a separate file management service
  } catch (error) {
    if (error instanceof HttpException) {
      throw error;
    }
    // Handle potential database errors (e.g., file already deleted)
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      // Record not found in Prisma
      throw new HttpException("File not found", 404);
    }
    throw new HttpException("Internal server error", 500);
  }
}
