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
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardSectionAtmageTransformer } from "../transformers/DiscussionBoardSectionAtmageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function putDiscussionBoardSuperAdminSectionsSectionIdImagesImageId(props: {
  superAdmin: SuperAdminPayload;
  sectionId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSectionImage.IUpdate;
}): Promise<IDiscussionBoardSection.Image> {
  // 1. Check if any fields are provided for update
  const hasUpdates =
    props.body.filename !== undefined ||
    props.body.mime_type !== undefined ||
    props.body.image_type !== undefined ||
    props.body.alt_text !== undefined;
  if (!hasUpdates) {
    // No updates requested, return current image
    const currentImage =
      await MyGlobal.prisma.discussion_board_section_images.findUniqueOrThrow({
        where: { id: props.imageId },
        ...DiscussionBoardSectionAtmageTransformer.select(),
      });
    return await DiscussionBoardSectionAtmageTransformer.transform(
      currentImage,
    );
  }
  // 2. Verify the section exists
  await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
    where: { id: props.sectionId },
  });
  // 3. Verify the image exists and belongs to the specified section
  const existingImage =
    await MyGlobal.prisma.discussion_board_section_images.findFirstOrThrow({
      where: {
        id: props.imageId,
        discussion_board_section_id: props.sectionId,
      },
    });
  // 4. Prepare update data with only provided fields
  const updateData: Prisma.discussion_board_section_imagesUpdateInput = {};
  if (props.body.filename !== undefined) {
    updateData.filename = props.body.filename;
  }
  if (props.body.mime_type !== undefined) {
    updateData.mime_type = props.body.mime_type;
  }
  if (props.body.image_type !== undefined) {
    // Check unique constraint if image_type changes
    if (props.body.image_type !== existingImage.image_type) {
      const conflictingImage =
        await MyGlobal.prisma.discussion_board_section_images.findUnique({
          where: {
            discussion_board_section_id_image_type: {
              discussion_board_section_id: props.sectionId,
              image_type: props.body.image_type,
            },
          },
        });
      if (conflictingImage && conflictingImage.id !== props.imageId) {
        throw new HttpException(
          `Another image with type '${props.body.image_type}' already exists for this section`,
          409,
        );
      }
    }
    updateData.image_type = props.body.image_type;
  }
  if (props.body.alt_text !== undefined) {
    // For nullable field, pass null directly
    updateData.alt_text = props.body.alt_text;
  }
  // 5. Update the image
  await MyGlobal.prisma.discussion_board_section_images.update({
    where: { id: props.imageId },
    data: updateData,
  });
  // 6. Retrieve the updated image with transformer select
  const updatedImage =
    await MyGlobal.prisma.discussion_board_section_images.findUniqueOrThrow({
      where: { id: props.imageId },
      ...DiscussionBoardSectionAtmageTransformer.select(),
    });
  // 7. Transform and return
  return await DiscussionBoardSectionAtmageTransformer.transform(updatedImage);
}
