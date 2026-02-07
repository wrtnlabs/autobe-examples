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

export async function deleteDiscussionBoardMemberArticlesArticleIdTagsTagId(props: {
  member: MemberPayload;
  articleId: string;
  tagId: string;
}): Promise<void> {
  // Get the article first to verify it exists and get author_id
  const article = await MyGlobal.prisma.discussion_board_articles.findFirst({
    where: {
      id: props.articleId as string & tags.Format<"uuid">,
      deleted_at: null,
    },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  // Check if user is the author of the article
  const isAuthor = article.author_id === props.member.id;
  // Check if user has admin privileges
  // Admins can be in either discussion_board_admins or discussion_board_super_admins
  const adminRecord = await MyGlobal.prisma.discussion_board_admins.findFirst({
    where: {
      member_id: props.member.id,
    },
  });
  const superAdminRecord =
    await MyGlobal.prisma.discussion_board_super_admins.findFirst({
      where: {
        id: props.member.id,
      },
    });
  const isAdmin = !!adminRecord || !!superAdminRecord;
  // Verify permission
  if (!isAuthor && !isAdmin) {
    throw new HttpException("Forbidden", 403);
  }
  // Delete the article-tag relationship (idempotent - no error if doesn't exist)
  await MyGlobal.prisma.discussion_board_article_tags.deleteMany({
    where: {
      bbs_article_id: props.articleId as string & tags.Format<"uuid">,
      tag_id: props.tagId as string & tags.Format<"uuid">,
    },
  });
}
