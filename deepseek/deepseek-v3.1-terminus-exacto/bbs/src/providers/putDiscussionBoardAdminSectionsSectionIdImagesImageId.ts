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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardSectionImageTransformer } from "../transformers/DiscussionBoardSectionImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdminSectionsSectionIdImagesImageId(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSectionImage.IUpdate;
}): Promise<IDiscussionBoardSectionImage> {
  // Verify section exists
  const section = await MyGlobal.prisma.discussion_board_sections.findUnique({
    where: { id: props.sectionId },
  });
  if (!section) {
    throw new HttpException("Section not found", 404);
  }
  // Verify image exists and belongs to the specified section
  const existingImage =
    await MyGlobal.prisma.discussion_board_section_images.findUnique({
      where: {
        id: props.imageId,
        discussion_board_section_id: props.sectionId,
      },
    });
  if (!existingImage) {
    throw new HttpException(
      "Image not found or does not belong to the specified section",
      404,
    );
  }
  // Validate image_type if provided
  if (props.body.image_type !== undefined) {
    const allowedTypes = ["banner", "icon", "promotional", "thumbnail"];
    if (!allowedTypes.includes(props.body.image_type)) {
      throw new HttpException(
        `Invalid image_type. Must be one of: ${allowedTypes.join(", ")}`,
        400,
      );
    }
    // Check uniqueness constraint: only one image per section per image_type
    if (props.body.image_type !== existingImage.image_type) {
      const existingTypeImage =
        await MyGlobal.prisma.discussion_board_section_images.findFirst({
          where: {
            discussion_board_section_id: props.sectionId,
            image_type: props.body.image_type,
            id: { not: props.imageId },
          },
        });
      if (existingTypeImage) {
        throw new HttpException(
          `Section already has a ${props.body.image_type} image`,
          400,
        );
      }
    }
  }
  // Validate MIME type if provided
  if (
    props.body.mime_type !== undefined &&
    !props.body.mime_type.startsWith("image/")
  ) {
    throw new HttpException("MIME type must be an image type", 400);
  }
  // Validate filename if provided
  if (props.body.filename !== undefined) {
    if (props.body.filename.trim().length === 0) {
      throw new HttpException("Filename cannot be empty", 400);
    }
    if (props.body.filename.length > 255) {
      throw new HttpException("Filename too long", 400);
    }
  }
  // Update the image metadata
  const updated = await MyGlobal.prisma.discussion_board_section_images.update({
    where: { id: props.imageId },
    data: {
      filename: props.body.filename ?? existingImage.filename,
      mime_type: props.body.mime_type ?? existingImage.mime_type,
      image_type: props.body.image_type ?? existingImage.image_type,
      alt_text:
        props.body.alt_text !== undefined
          ? props.body.alt_text
          : existingImage.alt_text,
    },
    ...DiscussionBoardSectionImageTransformer.select(),
  });
  return await DiscussionBoardSectionImageTransformer.transform(updated);
}
