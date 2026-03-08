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
  // Verify section exists (throws 404 automatically if not found)
  await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
    where: { id: props.sectionId },
  });
  // Check if section contains any articles
  const articleCount = await MyGlobal.prisma.discussion_board_articles.count({
    where: { section_id: props.sectionId },
  });
  // Business rule: Cannot delete section with existing articles
  if (articleCount > 0) {
    throw new HttpException(
      "Cannot delete section containing articles. Please remove or reassign articles first.",
      400,
    );
  }
  // Delete the section
  await MyGlobal.prisma.discussion_board_sections.delete({
    where: { id: props.sectionId },
  });
}
