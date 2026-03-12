import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { DiscussionBoardSectionTransformer } from "../transformers/DiscussionBoardSectionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdministratorSectionsSectionId(props: {
  administrator: AdministratorPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSection.IUpdate;
}): Promise<IDiscussionBoardSection> {
  // Find the section by id (must exist and not be soft deleted)
  const section =
    await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
      where: {
        id: props.sectionId,
        deleted_at: null,
      },
    });
  // Validate name uniqueness if provided
  if (props.body.name !== undefined) {
    const existingSection =
      await MyGlobal.prisma.discussion_board_sections.findFirst({
        where: {
          name: props.body.name,
          id: { not: props.sectionId },
          deleted_at: null,
        },
      });
    if (existingSection !== null) {
      throw new HttpException("Section name already exists", 409);
    }
  }
  // Create snapshot before update for audit trail
  await MyGlobal.prisma.discussion_board_section_snapshots.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      name: section.name,
      description: section.description,
      created_at: section.created_at,
      section_created_at: section.created_at,
      section_updated_at: section.updated_at,
      section: {
        connect: { id: props.sectionId },
      },
    },
  });
  // Update the section with provided fields
  const updated = await MyGlobal.prisma.discussion_board_sections.update({
    where: { id: props.sectionId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      updated_at: new Date(),
    },
  });
  // Return the updated section
  const result =
    await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
      where: { id: props.sectionId },
      ...DiscussionBoardSectionTransformer.select(),
    });
  return await DiscussionBoardSectionTransformer.transform(result);
}
