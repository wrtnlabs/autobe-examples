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

export async function deleteDiscussionBoardSuperAdminSectionsSectionIdImagesImageId(props: {
  superAdmin: SuperadminPayload;
  sectionId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First verify the section exists
  const section = await MyGlobal.prisma.discussion_board_sections.findUnique({
    where: { id: props.sectionId },
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
    throw new HttpException(
      "Section image not found or does not belong to the specified section",
      404,
    );
  }
  // Perform hard delete
  await MyGlobal.prisma.discussion_board_section_images.delete({
    where: {
      id: props.imageId,
    },
  });
  // Delete the associated file from storage
  // In a real implementation, this would call a file storage service
  // For now, we'll log the file path that should be deleted
  console.log(`File deletion required: ${image.storage_path}`);
  // Example of file deletion implementation:
  // await FileStorageService.deleteFile(image.storage_path);
}
