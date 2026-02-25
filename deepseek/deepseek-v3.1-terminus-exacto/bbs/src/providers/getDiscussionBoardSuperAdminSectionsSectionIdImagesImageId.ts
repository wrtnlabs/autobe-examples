import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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

export async function getDiscussionBoardSuperAdminSectionsSectionIdImagesImageId(props: {
  superAdmin: SuperAdminPayload;
  sectionId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSection.Image> {
  const image =
    await MyGlobal.prisma.discussion_board_section_images.findUniqueOrThrow({
      where: {
        id: props.imageId,
        section: { id: props.sectionId },
      },
      ...DiscussionBoardSectionAtmageTransformer.select(),
    });
  return await DiscussionBoardSectionAtmageTransformer.transform(image);
}
