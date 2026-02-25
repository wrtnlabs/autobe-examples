import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardSuperAdminSectionsSectionIdImagesImageId(props: {
  superAdmin: SuperAdminPayload;
  sectionId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  try {
    // Attempt to delete the section image directly
    await MyGlobal.prisma.discussion_board_section_images.delete({
      where: {
        id: props.imageId,
        discussion_board_section_id: props.sectionId,
      },
    });
  } catch (error) {
    // Handle case where image doesn't exist or doesn't belong to the section
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new HttpException(
        "Section image not found or does not belong to the specified section",
        404,
      );
    }
    throw error;
  }
}
