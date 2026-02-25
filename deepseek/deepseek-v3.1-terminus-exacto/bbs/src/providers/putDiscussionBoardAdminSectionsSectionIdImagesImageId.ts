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
import { DiscussionBoardSectionAtmageTransformer } from "../transformers/DiscussionBoardSectionAtmageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdminSectionsSectionIdImagesImageId(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSectionImage.IUpdate;
}): Promise<IDiscussionBoardSection.Image> {
  if (props.body.image_type !== undefined) {
    const existing =
      await MyGlobal.prisma.discussion_board_section_images.findUnique({
        where: {
          discussion_board_section_id_image_type: {
            discussion_board_section_id: props.sectionId,
            image_type: props.body.image_type,
          },
        },
      });
    if (existing && existing.id !== props.imageId) {
      throw new HttpException(
        "Image type already exists for this section",
        409,
      );
    }
  }
  await MyGlobal.prisma.discussion_board_section_images.findUniqueOrThrow({
    where: {
      id: props.imageId,
      discussion_board_section_id: props.sectionId,
    },
  });
  await MyGlobal.prisma.discussion_board_section_images.update({
    where: {
      id: props.imageId,
      discussion_board_section_id: props.sectionId,
    },
    data: {
      ...(props.body.filename !== undefined && {
        filename: props.body.filename,
      }),
      ...(props.body.mime_type !== undefined && {
        mime_type: props.body.mime_type,
      }),
      ...(props.body.image_type !== undefined && {
        image_type: props.body.image_type,
      }),
      ...(props.body.alt_text !== undefined && {
        alt_text: props.body.alt_text,
      }),
    },
  });
  const updated =
    await MyGlobal.prisma.discussion_board_section_images.findUniqueOrThrow({
      where: { id: props.imageId },
      ...DiscussionBoardSectionAtmageTransformer.select(),
    });
  return await DiscussionBoardSectionAtmageTransformer.transform(updated);
}
