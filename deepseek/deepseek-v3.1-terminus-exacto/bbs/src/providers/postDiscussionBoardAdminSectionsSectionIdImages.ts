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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardSectionAtmageTransformer } from "../transformers/DiscussionBoardSectionAtmageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postDiscussionBoardAdminSectionsSectionIdImages(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSectionImage.ICreate;
}): Promise<IDiscussionBoardSection.Image> {
  // First verify the section exists
  await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
    where: { id: props.sectionId },
  });
  // Check if admin has permission to manage this section
  // In discussion board system, administrators can manage sections they are assigned to
  const adminAssignment =
    await MyGlobal.prisma.discussion_board_section_administrators.findFirst({
      where: {
        discussion_board_admin_id: props.admin.id,
        discussion_board_section_id: props.sectionId,
      },
    });
  // If not explicitly assigned, admin doesn't have permission
  if (!adminAssignment) {
    throw new HttpException(
      "Forbidden: Admin does not have permission to manage this section",
      403,
    );
  }
  // Validate image type is one of the allowed values
  const validImageTypes = [
    "banner",
    "icon",
    "promotional",
    "thumbnail",
  ] as const;
  if (!validImageTypes.includes(props.body.image_type)) {
    throw new HttpException(
      `Invalid image type: ${props.body.image_type}. Must be one of: ${validImageTypes.join(", ")}`,
      400,
    );
  }
  // Check if image type already exists for this section (unique constraint)
  const existingImage =
    await MyGlobal.prisma.discussion_board_section_images.findUnique({
      where: {
        discussion_board_section_id_image_type: {
          discussion_board_section_id: props.sectionId,
          image_type: props.body.image_type,
        },
      },
    });
  if (existingImage) {
    throw new HttpException(
      `Image of type '${props.body.image_type}' already exists for this section`,
      400,
    );
  }
  // Create the image record using collector
  const sectionEntity = { id: props.sectionId };
  const data = await DiscussionBoardSectionImageCollector.collect({
    body: props.body,
    discussionBoardSections: sectionEntity,
  });
  const created = await MyGlobal.prisma.discussion_board_section_images.create({
    data,
    ...DiscussionBoardSectionAtmageTransformer.select(),
  });
  // Transform to response DTO
  return await DiscussionBoardSectionAtmageTransformer.transform(created);
}
