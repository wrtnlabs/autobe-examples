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
  // Verify admin exists and is active
  await MyGlobal.prisma.discussion_board_admins.findFirstOrThrow({
    where: {
      id: props.admin.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Check if section exists and is not soft-deleted
  const existing =
    await MyGlobal.prisma.discussion_board_sections.findFirstOrThrow({
      where: {
        id: props.sectionId,
        deleted_at: null,
      },
      select: { id: true },
    });
  // If name is being updated, check uniqueness across active sections
  if (props.body.name !== undefined) {
    const duplicate = await MyGlobal.prisma.discussion_board_sections.findFirst(
      {
        where: {
          name: props.body.name,
          deleted_at: null,
          id: { not: props.sectionId },
        },
        select: { id: true },
      },
    );
    if (duplicate !== null) {
      throw new HttpException(
        "Section name must be unique across active sections",
        400,
      );
    }
  }
  // Build update data
  const updateData: Prisma.discussion_board_sectionsUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.name !== undefined) {
    updateData.name = props.body.name;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  // Update the section
  await MyGlobal.prisma.discussion_board_sections.update({
    where: { id: props.sectionId },
    data: updateData,
  });
  // Fetch updated section with transformer
  const updated =
    await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
      where: { id: props.sectionId },
      ...DiscussionBoardSectionTransformer.select(),
    });
  return await DiscussionBoardSectionTransformer.transform(updated);
}
