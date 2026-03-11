import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function deleteDiscussionBoardMemberArticles(props: {
  member: MemberPayload;
  body: IDiscussionBoardArticle.IDeleteRequest;
}): Promise<void> {
  // 1. Verify administrator privileges
  const user = await MyGlobal.prisma.discussion_board_members.findUniqueOrThrow(
    {
      where: { id: props.member.id },
      select: { admin_grade: true },
    },
  );
  if (user.admin_grade === null) {
    throw new HttpException(
      "Administrator privileges required for bulk deletion",
      403,
    );
  }
  // 2. Build WHERE clause from request filters
  const whereInput: Prisma.discussion_board_articlesWhereInput = {
    // Default: only delete non-deleted articles
    deleted_at: null,
  };
  // Add optional filters
  if (props.body.status !== undefined && props.body.status !== null) {
    whereInput.status = props.body.status;
  }
  if (props.body.author_id !== undefined && props.body.author_id !== null) {
    whereInput.discussion_board_member_id = props.body.author_id;
  }
  if (props.body.section_id !== undefined && props.body.section_id !== null) {
    whereInput.discussion_board_section_id = props.body.section_id;
  }
  if (
    props.body.title_pattern !== undefined &&
    props.body.title_pattern !== null
  ) {
    whereInput.title = { contains: props.body.title_pattern };
  }
  // Handle date range filters
  const dateRange: {
    gte?: Date;
    lte?: Date;
  } = {};
  if (
    props.body.created_after !== undefined &&
    props.body.created_after !== null
  ) {
    dateRange.gte = new Date(props.body.created_after);
  }
  if (
    props.body.created_before !== undefined &&
    props.body.created_before !== null
  ) {
    dateRange.lte = new Date(props.body.created_before);
  }
  if (Object.keys(dateRange).length > 0) {
    whereInput.created_at = dateRange;
  }
  // 3. Execute deletion in transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Get count of articles to be deleted for audit purposes
    const articleCount = await tx.discussion_board_articles.count({
      where: whereInput,
    });
    if (articleCount === 0) {
      // No articles to delete - early exit
      return;
    }
    // Delete articles (cascades to comments and attachments automatically via onDelete: Cascade)
    await tx.discussion_board_articles.deleteMany({
      where: whereInput,
    });
  });
  // 4. Return void as specified
}
