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
  sectionId: string;
  body: IDiscussionBoardSection.IUpdate;
}): Promise<IDiscussionBoardSection> {
  // Validate section exists and admin has permission
  const existingSection =
    await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
      where: { id: props.sectionId as string & tags.Format<"uuid"> },
    });
  // Check name uniqueness if name is being updated
  if (props.body.name !== undefined) {
    const existingByName =
      await MyGlobal.prisma.discussion_board_sections.findFirst({
        where: {
          id: { not: props.sectionId as string & tags.Format<"uuid"> },
          name: props.body.name,
        },
      });
    if (existingByName !== null) {
      throw new HttpException("Section name already exists", 409);
    }
  }
  // Update the section (no updated_at field in schema)
  const updatedSection = await MyGlobal.prisma.discussion_board_sections.update(
    {
      where: { id: props.sectionId as string & tags.Format<"uuid"> },
      data: {
        ...(props.body.name !== undefined && { name: props.body.name }),
        ...(props.body.description !== undefined && {
          description: props.body.description,
        }),
      },
    },
  );
  // Transform and return
  return await DiscussionBoardSectionTransformer.transform(updatedSection);
}
