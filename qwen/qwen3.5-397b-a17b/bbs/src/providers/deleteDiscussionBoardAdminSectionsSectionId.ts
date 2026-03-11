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
  // Verify section exists and is not already deleted
  const section = await MyGlobal.prisma.discussion_board_sections.findUnique({
    where: {
      id: props.sectionId,
      deleted_at: null,
    },
  });
  if (section === null) {
    throw new HttpException("Not Found", 404);
  }
  // Check if any articles exist in this section (not deleted)
  const articleCount = await MyGlobal.prisma.discussion_board_articles.count({
    where: {
      discussion_board_section_id: props.sectionId,
      deleted_at: null,
    },
  });
  // Reject deletion if section contains articles
  if (articleCount > 0) {
    throw new HttpException("Conflict: Section contains articles", 409);
  }
  // Soft delete the section by setting deleted_at
  await MyGlobal.prisma.discussion_board_sections.update({
    where: {
      id: props.sectionId,
    },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
