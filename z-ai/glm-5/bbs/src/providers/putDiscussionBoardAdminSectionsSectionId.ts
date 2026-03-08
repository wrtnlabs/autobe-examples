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
  await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
    where: { id: props.sectionId },
    select: { id: true },
  });
  // Check name uniqueness if name is being updated
  if (props.body.name !== undefined) {
    const existing = await MyGlobal.prisma.discussion_board_sections.findFirst({
      where: {
        name: { equals: props.body.name, mode: "insensitive" },
        id: { not: props.sectionId },
      },
      select: { id: true },
    });
    if (existing !== null) {
      throw new HttpException("Section name already exists", 409);
    }
  }
  // Update section with provided fields
  const updated = await MyGlobal.prisma.discussion_board_sections.update({
    where: { id: props.sectionId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      updated_at: new Date(),
    },
    ...DiscussionBoardSectionTransformer.select(),
  });
  return await DiscussionBoardSectionTransformer.transform(updated);
}
