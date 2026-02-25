import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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

export async function getDiscussionBoardAdminSectionsSectionIdImagesImageId(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSection.Image> {
  const image =
    await MyGlobal.prisma.discussion_board_section_images.findUniqueOrThrow({
      where: { id: props.imageId },
      ...DiscussionBoardSectionAtmageTransformer.select(),
    });
  if (image.section.id !== props.sectionId) {
    throw new HttpException(
      "Image does not belong to the specified section",
      404,
    );
  }
  return await DiscussionBoardSectionAtmageTransformer.transform(image);
}
