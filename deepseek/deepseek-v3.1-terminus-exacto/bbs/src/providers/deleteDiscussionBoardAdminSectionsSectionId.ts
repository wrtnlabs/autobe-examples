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
  // 1. Verify section exists and is not already deleted
  try {
    await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
      where: {
        id: props.sectionId,
        deleted_at: null,
      },
      select: { id: true },
    });
  } catch (error) {
    // If section doesn't exist (404) or already deleted, throw appropriate error
    const exists = await MyGlobal.prisma.discussion_board_sections.findUnique({
      where: { id: props.sectionId },
      select: { id: true, deleted_at: true },
    });
    if (!exists) {
      throw new HttpException("Section not found", 404);
    }
    if (exists.deleted_at !== null) {
      throw new HttpException("Section already deleted", 409);
    }
    // Re-throw unexpected errors
    throw error;
  }
  // 2. Check if section contains any articles
  const articleCount = await MyGlobal.prisma.discussion_board_articles.count({
    where: {
      discussion_board_section_id: props.sectionId,
      deleted_at: null,
    },
  });
  if (articleCount > 0) {
    throw new HttpException(
      `Cannot delete section containing ${articleCount} article(s)`,
      400,
    );
  }
  // 3. Perform soft deletion with current timestamp
  await MyGlobal.prisma.discussion_board_sections.update({
    where: { id: props.sectionId },
    data: { deleted_at: new Date() },
  });
  // 4. Return void (implicit)
}
