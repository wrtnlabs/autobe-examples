import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardSectionImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardSectionImageCollector } from "../collectors/DiscussionBoardSectionImageCollector";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardSectionAtmageTransformer } from "../transformers/DiscussionBoardSectionAtmageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminSectionsSectionIdImages(props: {
  superAdmin: SuperAdminPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSectionImage.ICreate;
}): Promise<IDiscussionBoardSection.Image> {
  // Validate section exists and is active (not deleted)
  const section =
    await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
      where: { id: props.sectionId },
    });
  // Check if section is deleted (soft delete check)
  if (section.deleted_at !== null) {
    throw new HttpException("Cannot add image to deleted section", 400);
  }
  // Check for existing image with same section_id and image_type (unique constraint)
  const existingImage =
    await MyGlobal.prisma.discussion_board_section_images.findUnique({
      where: {
        discussion_board_section_id_image_type: {
          discussion_board_section_id: props.sectionId,
          image_type: props.body.image_type,
        },
      },
    });
  if (existingImage !== null) {
    throw new HttpException(
      `Image of type '${props.body.image_type}' already exists for this section`,
      400,
    );
  }
  // Validate image_type is one of allowed values
  const allowedImageTypes = [
    "banner",
    "icon",
    "promotional",
    "thumbnail",
  ] as const;
  if (!allowedImageTypes.includes(props.body.image_type)) {
    throw new HttpException(
      `Invalid image_type. Must be one of: ${allowedImageTypes.join(", ")}`,
      400,
    );
  }
  // Validate image dimensions and file size limits (business requirements)
  if (props.body.width <= 0 || props.body.height <= 0) {
    throw new HttpException("Image dimensions must be positive values", 400);
  }
  if (props.body.file_size <= 0) {
    throw new HttpException("File size must be positive", 400);
  }
  // Add super administrator audit info to storage path for uniqueness
  const uniqueStoragePath = `/sections/${props.sectionId}/images/${v4()}/${props.body.storage_path}`;
  // Use collector to transform request body to database input with updated storage path
  const created = await MyGlobal.prisma.discussion_board_section_images.create({
    data: await DiscussionBoardSectionImageCollector.collect({
      body: {
        ...props.body,
        storage_path: uniqueStoragePath,
      },
      discussionBoardSections: { id: props.sectionId },
    }),
    ...DiscussionBoardSectionAtmageTransformer.select(),
  });
  // Transform database record to response DTO
  return await DiscussionBoardSectionAtmageTransformer.transform(created);
}
