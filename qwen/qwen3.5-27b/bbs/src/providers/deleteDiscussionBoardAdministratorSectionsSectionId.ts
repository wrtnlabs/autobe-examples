import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardAdministratorSectionsSectionId(props: {
  administrator: AdministratorPayload;
  sectionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Fetch section to verify it exists and is not already deleted
  const section = await MyGlobal.prisma.discussion_board_sections.findUnique({
    where: { id: props.sectionId },
    select: { id: true, deleted_at: true },
  });
  if (section === null) {
    throw new HttpException("Section not found", 404);
  }
  // Check if section is already deleted
  if (section.deleted_at !== null) {
    throw new HttpException("Section is already deleted", 404);
  }
  // Check if section contains any active articles
  const articleCount = await MyGlobal.prisma.discussion_board_articles.count({
    where: {
      discussion_board_section_id: props.sectionId,
      deleted_at: null,
    },
  });
  // Reject deletion if articles exist
  if (articleCount > 0) {
    throw new HttpException("Cannot delete section containing articles", 409);
  }
  // Perform soft delete by setting deleted_at timestamp
  await MyGlobal.prisma.discussion_board_sections.update({
    where: { id: props.sectionId },
    data: {
      deleted_at: new Date(),
    },
  });
}
