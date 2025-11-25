import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { RegisteredmemberPayload } from "../decorators/payload/RegisteredmemberPayload";

export async function deleteEconPoliticalDiscussionRegisteredMemberArticlesArticleId(props: {
  registeredMember: RegisteredmemberPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the article to verify it exists and check ownership
  const existing =
    await MyGlobal.prisma.econ_political_discussion_articles.findUnique({
      where: { id: props.articleId },
    });

  if (!existing) {
    throw new HttpException("Article not found", 404);
  }

  // Check if article is already deleted
  if (existing.deleted_at !== null) {
    throw new HttpException("Article is already deleted", 400);
  }

  // Verify ownership - only author can delete unless they have admin privileges
  if (
    existing.econ_political_discussion_user_id !== props.registeredMember.id
  ) {
    // TODO: Add admin privilege check if needed
    throw new HttpException("You can only delete your own articles", 403);
  }

  // Perform soft deletion by setting deleted_at timestamp
  await MyGlobal.prisma.econ_political_discussion_articles.update({
    where: { id: props.articleId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
