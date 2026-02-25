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
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardSectionTransformer } from "../transformers/DiscussionBoardSectionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdminSectionsSectionId(props: {
  superAdmin: SuperAdminPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSection.IUpdate;
}): Promise<IDiscussionBoardSection> {
  // Check if there's anything to update
  const hasUpdates =
    props.body.name !== undefined ||
    props.body.description !== undefined ||
    props.body.status !== undefined ||
    props.body.display_order !== undefined;
  if (!hasUpdates) {
    // Return current section if no updates requested
    const currentSection =
      await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
        where: { id: props.sectionId },
        ...DiscussionBoardSectionTransformer.select(),
      });
    return await DiscussionBoardSectionTransformer.transform(currentSection);
  }
  // Verify section exists and is not deleted
  const existingSection =
    await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
      where: {
        id: props.sectionId,
        deleted_at: null,
      },
    });
  // Validate name uniqueness if name is being updated
  if (props.body.name !== undefined) {
    if (props.body.name.length < 2 || props.body.name.length > 50) {
      throw new HttpException(
        "Section name must be between 2 and 50 characters",
        400,
      );
    }
    const existingSectionWithName =
      await MyGlobal.prisma.discussion_board_sections.findFirst({
        where: {
          name: props.body.name,
          id: { not: props.sectionId },
          deleted_at: null,
        },
      });
    if (existingSectionWithName) {
      throw new HttpException("Section name already exists", 400);
    }
  }
  // Validate description length if being updated
  if (
    props.body.description !== undefined &&
    (props.body.description.length < 10 || props.body.description.length > 500)
  ) {
    throw new HttpException(
      "Section description must be between 10 and 500 characters",
      400,
    );
  }
  // Validate status if being updated
  if (
    props.body.status !== undefined &&
    !["active", "inactive", "archived"].includes(props.body.status)
  ) {
    throw new HttpException(
      "Section status must be one of: active, inactive, archived",
      400,
    );
  }
  // Validate display_order if being updated
  if (props.body.display_order !== undefined && props.body.display_order < 0) {
    throw new HttpException(
      "Display order must be a non-negative integer",
      400,
    );
  }
  // Build typed update data object
  const updateData: Prisma.discussion_board_sectionsUpdateInput = {};
  if (props.body.name !== undefined) updateData.name = props.body.name;
  if (props.body.description !== undefined)
    updateData.description = props.body.description;
  if (props.body.status !== undefined) updateData.status = props.body.status;
  if (props.body.display_order !== undefined)
    updateData.display_order = props.body.display_order;
  // Update modification tracking
  updateData.lastModifiedByAdmin = { connect: { id: props.superAdmin.id } };
  updateData.updated_at = new Date();
  // Perform update
  await MyGlobal.prisma.discussion_board_sections.update({
    where: { id: props.sectionId },
    data: updateData,
  });
  // Retrieve updated section with full relations
  const updatedSection =
    await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
      where: { id: props.sectionId },
      ...DiscussionBoardSectionTransformer.select(),
    });
  return await DiscussionBoardSectionTransformer.transform(updatedSection);
}
