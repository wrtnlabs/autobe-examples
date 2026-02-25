import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardSectionTransformer } from "../transformers/DiscussionBoardSectionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardUserSectionsSectionId(props: {
  user: UserPayload;
  sectionId: string;
  body: IDiscussionBoardSection.IUpdate;
}): Promise<IDiscussionBoardSection> {
  // Verify user has admin permission
  const user = await MyGlobal.prisma.discussion_board_users.findUniqueOrThrow({
    where: { id: props.user.id },
    select: { id: true, permission_level: true },
  });
  if (
    user.permission_level !== "ADMINISTRATOR" &&
    user.permission_level !== "SUPER_ADMINISTRATOR"
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Find section - must exist and not be soft-deleted
  const existingSection =
    await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
      where: { id: props.sectionId },
      select: { id: true, name: true, deleted_at: true },
    });
  if (existingSection.deleted_at !== null) {
    throw new HttpException("Section not found", 404);
  }
  // Check name uniqueness (excluding current section)
  if (props.body.name !== existingSection.name) {
    const conflictSection =
      await MyGlobal.prisma.discussion_board_sections.findFirst({
        where: {
          name: props.body.name,
          deleted_at: null,
          id: { not: props.sectionId },
        },
      });
    if (conflictSection !== null) {
      throw new HttpException("A section with this name already exists.", 400);
    }
  }
  // Update section
  const updated = await MyGlobal.prisma.discussion_board_sections.update({
    where: { id: props.sectionId },
    data: {
      name: props.body.name,
      description: props.body.description,
      modifier_id: props.user.id,
      updated_at: new Date(),
    },
    ...DiscussionBoardSectionTransformer.select(),
  });
  return await DiscussionBoardSectionTransformer.transform(updated);
}
