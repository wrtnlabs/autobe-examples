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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardSectionImageTransformer } from "../transformers/DiscussionBoardSectionImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdminSectionsSectionIdImagesImageId(props: {
  superAdmin: SuperadminPayload;
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
  // Verify image exists and belongs to the section
  const existingImage =
    await MyGlobal.prisma.discussion_board_section_images.findUnique({
      where: { id: props.imageId },
    });
  if (!existingImage) {
    throw new HttpException("Image not found", 404);
  }
  if (existingImage.discussion_board_section_id !== props.sectionId) {
    throw new HttpException(
      "Image does not belong to the specified section",
      400,
    );
  }
  // Validate image_type if provided
  if (props.body.image_type) {
    const allowedTypes = ["banner", "icon", "promotional", "thumbnail"];
    if (!allowedTypes.includes(props.body.image_type)) {
      throw new HttpException(
        `Invalid image type. Allowed values: ${allowedTypes.join(", ")}`,
        400,
      );
    }
  }
  // Prepare update data
  const updateData: Prisma.discussion_board_section_imagesUpdateInput = {};
  if (props.body.filename !== undefined) {
    updateData.filename = props.body.filename;
  }
  if (props.body.mime_type !== undefined) {
    updateData.mime_type = props.body.mime_type;
  }
  if (props.body.image_type !== undefined) {
    updateData.image_type = props.body.image_type;
  }
  if (props.body.alt_text !== undefined) {
    updateData.alt_text =
      props.body.alt_text === null ? null : props.body.alt_text;
  }
  // Update the image metadata
  const updated = await MyGlobal.prisma.discussion_board_section_images.update({
    where: { id: props.imageId },
    data: updateData,
    ...DiscussionBoardSectionImageTransformer.select(),
  });
  return await DiscussionBoardSectionImageTransformer.transform(updated);
}
