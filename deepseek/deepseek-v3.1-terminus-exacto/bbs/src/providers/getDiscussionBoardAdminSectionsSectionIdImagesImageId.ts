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

export async function getDiscussionBoardAdminSectionsSectionIdImagesImageId(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSectionImage> {
  const image =
    await MyGlobal.prisma.discussion_board_section_images.findUnique({
      where: {
        id: props.imageId,
        discussion_board_section_id: props.sectionId,
      },
      ...DiscussionBoardSectionImageTransformer.select(),
    });
  if (!image) {
    throw new HttpException("Section image not found", 404);
  }
  return await DiscussionBoardSectionImageTransformer.transform(image);
}
