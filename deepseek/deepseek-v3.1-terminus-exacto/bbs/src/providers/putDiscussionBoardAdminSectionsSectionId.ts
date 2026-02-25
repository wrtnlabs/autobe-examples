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
  // Verify section exists
  const existingSection =
    await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
      where: {
        id: props.sectionId,
        deleted_at: null,
      },
      select: { id: true },
    });
  // Check name uniqueness if updating name
  if (props.body.name !== undefined) {
    const existingSectionWithName =
      await MyGlobal.prisma.discussion_board_sections.findFirst({
        where: {
          name: props.body.name,
          id: { not: props.sectionId },
          deleted_at: null,
        },
      });
    if (existingSectionWithName) {
      throw new HttpException("Section name must be unique", 400);
    }
  }
  // Build update data with only provided fields
  const updateData = {
    ...(props.body.name !== undefined && { name: props.body.name }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.display_order !== undefined && {
      display_order: props.body.display_order,
    }),
    lastModifiedByAdmin: { connect: { id: props.admin.id } },
    updated_at: new Date(),
  } satisfies Prisma.discussion_board_sectionsUpdateInput;
  // Update the section
  await MyGlobal.prisma.discussion_board_sections.update({
    where: { id: props.sectionId },
    data: updateData,
  });
  // Fetch and return updated section
  const updatedSection =
    await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
      where: { id: props.sectionId },
      ...DiscussionBoardSectionTransformer.select(),
    });
  return await DiscussionBoardSectionTransformer.transform(updatedSection);
}
