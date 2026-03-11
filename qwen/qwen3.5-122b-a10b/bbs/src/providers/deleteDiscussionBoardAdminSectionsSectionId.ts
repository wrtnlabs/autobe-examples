import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardAdminSectionsSectionId(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify section exists and is not soft-deleted
  const section =
    await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
      where: {
        id: props.sectionId,
        deleted_at: null,
      },
    });
  // Count articles in section (excluding soft-deleted ones)
  const articleCount = await MyGlobal.prisma.discussion_board_articles.count({
    where: {
      discussion_board_section_id: props.sectionId,
      deleted_at: null,
    },
  });
  // Section must have zero articles for deletion
  if (articleCount > 0) {
    throw new HttpException(
      "Cannot delete section with existing articles. Please remove or reassign all articles first.",
      409,
    );
  }
  // Soft delete the section
  await MyGlobal.prisma.discussion_board_sections.update({
    where: { id: props.sectionId },
    data: { deleted_at: new Date().toISOString() },
  });
}
