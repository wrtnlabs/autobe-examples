import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardUserSectionsSectionId(props: {
  user: UserPayload;
  sectionId: string;
}): Promise<void> {
  // 1. Authorization Check - Verify user has admin permission
  const userRecord =
    await MyGlobal.prisma.discussion_board_users.findUniqueOrThrow({
      where: { id: props.user.id },
      select: { permission_level: true },
    });
  if (
    userRecord.permission_level !== "ADMINISTRATOR" &&
    userRecord.permission_level !== "SUPER_ADMINISTRATOR"
  ) {
    throw new HttpException(
      "Forbidden: Administrator permission required",
      403,
    );
  }
  // 2. Section Lookup - Find non-deleted section
  const section =
    await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
      where: {
        id: props.sectionId,
        deleted_at: null,
      },
      select: { id: true },
    });
  // 3. Cascade Article Soft-Delete & 4. Section Soft-Delete
  // Use transaction for atomicity
  const now = new Date();
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.discussion_board_articles.updateMany({
      where: {
        discussion_board_section_id: section.id,
        deleted_at: null,
      },
      data: {
        deleted_at: now,
      },
    }),
    MyGlobal.prisma.discussion_board_sections.update({
      where: { id: section.id },
      data: {
        deleted_at: now,
      },
    }),
  ]);
}
