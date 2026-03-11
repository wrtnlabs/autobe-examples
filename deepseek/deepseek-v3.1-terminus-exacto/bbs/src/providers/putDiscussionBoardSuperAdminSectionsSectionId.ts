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
  // Verify section exists and is active
  const section =
    await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
      where: { id: props.sectionId },
    });
  if (section.deleted_at !== null) {
    throw new HttpException("Section is deleted", 400);
  }
  // Check name uniqueness if name is being updated
  if (props.body.name !== undefined && props.body.name !== section.name) {
    const existing = await MyGlobal.prisma.discussion_board_sections.findFirst({
      where: {
        name: props.body.name,
        deleted_at: null,
        id: { not: props.sectionId },
      },
    });
    if (existing !== null) {
      throw new HttpException("Section name already exists", 400);
    }
  }
  // Prepare update data
  const updateData: Prisma.discussion_board_sectionsUpdateInput = {};
  if (props.body.name !== undefined) {
    updateData.name = props.body.name;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  // If nothing to update, return current section
  if (Object.keys(updateData).length === 0) {
    const current =
      await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
        where: { id: props.sectionId },
        ...DiscussionBoardSectionTransformer.select(),
      });
    return await DiscussionBoardSectionTransformer.transform(current);
  }
  // Always update updated_at timestamp
  updateData.updated_at = new Date();
  await MyGlobal.prisma.discussion_board_sections.update({
    where: { id: props.sectionId },
    data: updateData,
  });
  // Fetch and return updated section
  const updated =
    await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
      where: { id: props.sectionId },
      ...DiscussionBoardSectionTransformer.select(),
    });
  return await DiscussionBoardSectionTransformer.transform(updated);
}
