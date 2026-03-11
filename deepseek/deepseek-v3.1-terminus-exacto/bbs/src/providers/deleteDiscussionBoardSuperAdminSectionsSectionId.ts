import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardSuperAdminSectionsSectionId(props: {
  superAdmin: SuperadminPayload;
  sectionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Use transaction for atomicity
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Check if section exists and is not already deleted
    const section = await tx.discussion_board_sections.findFirstOrThrow({
      where: {
        id: props.sectionId,
        deleted_at: null,
      },
    });
    // Check if section contains any articles
    const articleCount = await tx.discussion_board_articles.count({
      where: {
        discussion_board_section_id: props.sectionId,
        deleted_at: null,
      },
    });
    if (articleCount > 0) {
      throw new HttpException(
        `Cannot delete section that contains ${articleCount} article(s). Please remove or reassign all articles first.`,
        400,
      );
    }
    // Get super admin record to find associated member ID
    const superAdminRecord =
      await tx.discussion_board_super_admins.findFirstOrThrow({
        where: {
          id: props.superAdmin.id,
          deleted_at: null,
        },
        select: {
          id: true,
        },
      });
    // Perform soft deletion
    await tx.discussion_board_sections.update({
      where: { id: props.sectionId },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    });
    // Create deletion audit record
    const deletionId = v4();
    const now = new Date();
    await tx.discussion_board_section_deletions.create({
      data: {
        id: deletionId,
        discussion_board_section_id: props.sectionId,
        deleted_by_member_id: superAdminRecord.id,
        reason: null,
        created_at: now,
        updated_at: now,
      },
    });
  });
  // Return void
  return;
}
