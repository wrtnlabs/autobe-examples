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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardSectionTransformer } from "../transformers/DiscussionBoardSectionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdminSectionsSectionId(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSection.IUpdate;
}): Promise<IDiscussionBoardSection> {
  // Check if section exists and is not deleted
  const existingSection =
    await MyGlobal.prisma.discussion_board_sections.findUnique({
      where: { id: props.sectionId, deleted_at: null },
    });
  if (!existingSection) {
    throw new HttpException("Section not found", 404);
  }
  // Validate unique name constraint (excluding current section)
  if (props.body.name) {
    const existingSectionWithSameName =
      await MyGlobal.prisma.discussion_board_sections.findFirst({
        where: {
          name: props.body.name,
          id: { not: props.sectionId },
          deleted_at: null,
        },
      });
    if (existingSectionWithSameName) {
      throw new HttpException("Section name already exists", 400);
    }
  }
  // Prepare update data
  const updateData: Prisma.discussion_board_sectionsUpdateInput = {
    updated_at: toISOStringSafe(new Date()),
    lastModifiedByAdmin: { connect: { id: props.admin.id } },
  };
  // Add optional fields if provided
  if (props.body.name !== undefined) updateData.name = props.body.name;
  if (props.body.description !== undefined)
    updateData.description = props.body.description;
  if (props.body.status !== undefined) updateData.status = props.body.status;
  if (props.body.display_order !== undefined)
    updateData.display_order = props.body.display_order;
  // Update section
  const updatedSection = await MyGlobal.prisma.discussion_board_sections.update(
    {
      where: { id: props.sectionId },
      data: updateData,
      ...DiscussionBoardSectionTransformer.select(),
    },
  );
  return await DiscussionBoardSectionTransformer.transform(updatedSection);
}
