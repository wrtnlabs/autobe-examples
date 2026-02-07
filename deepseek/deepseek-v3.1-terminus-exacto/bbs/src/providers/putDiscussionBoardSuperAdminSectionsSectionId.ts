import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardSectionTransformer } from "../transformers/DiscussionBoardSectionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdminSectionsSectionId(props: {
  superAdmin: SuperadminPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSection.IUpdate;
}): Promise<IDiscussionBoardSection> {
  // Check if section exists and is not deleted
  const existingSection =
    await MyGlobal.prisma.discussion_board_sections.findUnique({
      where: {
        id: props.sectionId,
        deleted_at: null,
      },
    });
  if (!existingSection) {
    throw new HttpException("Section not found or has been deleted", 404);
  }
  // Validate name uniqueness if name is being updated
  if (props.body.name !== undefined) {
    const nameExists =
      await MyGlobal.prisma.discussion_board_sections.findFirst({
        where: {
          name: props.body.name,
          deleted_at: null,
          id: { not: props.sectionId },
        },
      });
    if (nameExists) {
      throw new HttpException(
        "Section name already exists. Please choose a different name.",
        400,
      );
    }
  }
  // Validate display_order if being updated
  if (props.body.display_order !== undefined && props.body.display_order < 1) {
    throw new HttpException(
      "Display order must be a positive integer greater than 0",
      400,
    );
  }
  // Validate status if being updated
  if (
    props.body.status !== undefined &&
    !["active", "inactive", "archived"].includes(props.body.status)
  ) {
    throw new HttpException(
      "Status must be one of: active, inactive, or archived",
      400,
    );
  }
  // Prepare update data
  const updateData: Prisma.discussion_board_sectionsUpdateInput = {};
  if (props.body.name !== undefined) updateData.name = props.body.name;
  if (props.body.description !== undefined)
    updateData.description = props.body.description;
  if (props.body.status !== undefined) updateData.status = props.body.status;
  if (props.body.display_order !== undefined)
    updateData.display_order = props.body.display_order;
  // Always update these fields
  updateData.lastModifiedByAdmin = { connect: { id: props.superAdmin.id } };
  updateData.updated_at = toISOStringSafe(new Date());
  // Perform update
  const updatedSection = await MyGlobal.prisma.discussion_board_sections.update(
    {
      where: { id: props.sectionId },
      data: updateData,
      ...DiscussionBoardSectionTransformer.select(),
    },
  );
  return await DiscussionBoardSectionTransformer.transform(updatedSection);
}
