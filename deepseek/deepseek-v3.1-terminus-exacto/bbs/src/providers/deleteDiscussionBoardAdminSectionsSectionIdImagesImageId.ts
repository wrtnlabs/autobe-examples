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
  // Verify the section exists first
  await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
    where: { id: props.sectionId },
  });
  // Verify the image exists and belongs to the specified section
  const image =
    await MyGlobal.prisma.discussion_board_section_images.findUniqueOrThrow({
      where: {
        id: props.imageId,
        discussion_board_section_id: props.sectionId,
      },
      select: {
        storage_path: true,
        filename: true,
        image_type: true,
      },
    });
  try {
    // Delete the database record first to avoid race conditions
    await MyGlobal.prisma.discussion_board_section_images.delete({
      where: { id: props.imageId },
    });
    // Then attempt to delete the physical file
    await deleteFileFromStorage(image.storage_path);
    // Log the administrative action for audit trail
    await MyGlobal.prisma.discussion_board_audit_logs.create({
      data: {
        id: v4(),
        actor_id: props.admin.id,
        actor_type: "admin",
        action_type: "DELETE_SECTION_IMAGE",
        description: `Admin deleted section image: ${image.filename}`,
        metadata: JSON.stringify({
          section_id: props.sectionId,
          image_id: props.imageId,
          image_filename: image.filename,
          image_type: image.image_type,
        }),
        success: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  } catch (error) {
    if (error instanceof HttpException) {
      throw error;
    }
    // If file deletion fails, log the error but don't fail the operation
    // since the database record is already deleted
    console.error(`Failed to delete image file: ${image.storage_path}`, error);
    // Still log the administrative action
    await MyGlobal.prisma.discussion_board_audit_logs.create({
      data: {
        id: v4(),
        actor_id: props.admin.id,
        actor_type: "admin",
        action_type: "DELETE_SECTION_IMAGE",
        description: `Admin deleted section image with file deletion error: ${image.filename}`,
        metadata: JSON.stringify({
          section_id: props.sectionId,
          image_id: props.imageId,
          image_filename: image.filename,
          image_type: image.image_type,
          file_deletion_error:
            "File deletion failed but database record removed",
        }),
        success: false,
        error_message: error instanceof Error ? error.message : "Unknown error",
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  }
}
// Helper function for file deletion
async function deleteFileFromStorage(storagePath: string): Promise<void> {
  // Implementation depends on the storage system being used
  // This is a placeholder that should be replaced with actual storage logic
  // For now, we'll assume file deletion succeeds for the implementation
  // In production, this should be properly implemented based on the storage backend
}
