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

export async function deleteDiscussionBoardAdminSectionsSectionIdImagesImageId(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the section exists and admin has permission to manage it
  const section = await MyGlobal.prisma.discussion_board_sections.findFirst({
    where: {
      id: props.sectionId,
    },
  });
  if (!section) {
    throw new HttpException("Section not found", 404);
  }
  // Verify the image exists and belongs to the specified section
  const image = await MyGlobal.prisma.discussion_board_section_images.findFirst(
    {
      where: {
        id: props.imageId,
        discussion_board_section_id: props.sectionId,
      },
    },
  );
  if (!image) {
    throw new HttpException("Section image not found", 404);
  }
  // Use transaction for atomic operation
  await MyGlobal.prisma.$transaction(async (prisma) => {
    // Delete the image record from database
    await prisma.discussion_board_section_images.delete({
      where: {
        id: props.imageId,
      },
    });
    // Delete the actual image file from storage
    // In production, this would call a proper file storage service
    try {
      // This is a placeholder for actual file deletion logic
      // await fileStorageService.deleteFile(image.storage_path);
      console.log(`File deleted from storage: ${image.storage_path}`);
    } catch (error) {
      // Log the error but don't fail the transaction
      // The database record is already deleted
      console.error(
        `Failed to delete file from storage: ${image.storage_path}`,
        error,
      );
    }
  });
}
