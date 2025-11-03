import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteDiscussionBoardMemberArticlesArticleIdTagsTagSlug(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  tagSlug: string;
}): Promise<void> {
  const { member, articleId, tagSlug } = props;

  // Resolve tag by slug (ensure not soft-deleted)
  const tag = await MyGlobal.prisma.discussion_board_tags.findFirst({
    where: { slug: tagSlug, deleted_at: null },
  });
  if (!tag) throw new HttpException("Not Found", 404);

  // Validate article exists and is not soft-deleted
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: articleId },
  });
  if (!article || article.deleted_at !== null)
    throw new HttpException("Not Found", 404);

  // Load member record to check role
  const memberRecord = await MyGlobal.prisma.discussion_board_member.findUnique(
    {
      where: { id: member.id },
    },
  );
  if (!memberRecord) throw new HttpException("Unauthorized", 401);

  const isOwner = article.discussion_board_member_id === member.id;
  const isPrivileged =
    memberRecord.role === "admin" || memberRecord.role === "moderator";

  if (!isOwner && !isPrivileged) {
    throw new HttpException(
      "Unauthorized: You can only remove tags from your own articles",
      403,
    );
  }

  // Verify association exists
  const association =
    await MyGlobal.prisma.discussion_board_article_tags.findFirst({
      where: {
        discussion_board_article_id: articleId,
        discussion_board_tag_id: tag.id,
      },
    });
  if (!association) throw new HttpException("Not Found", 404);

  // Perform hard delete of the association
  await MyGlobal.prisma.discussion_board_article_tags.delete({
    where: { id: association.id },
  });

  // If removal performed by privileged actor (not the owner), record audit
  if (!isOwner && isPrivileged) {
    await MyGlobal.prisma.discussion_board_moderation_audit.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        moderation_action_id: null,
        report_id: null,
        actor_moderator_id: null,
        event_type: "article.tag.removal",
        event_payload: JSON.stringify({
          actor_member_id: member.id,
          article_id: articleId,
          tag_id: tag.id,
          tag_slug: tag.slug,
          association_id: association.id,
        }),
        occurred_at: toISOStringSafe(new Date()),
      },
    });
  }

  return;
}
