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
  articleId: string & tags.Format<"uuid">;
  tagId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify article exists
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
    });
  // Verify user is authorized (article author or admin/superAdmin)
  if (article.author_id !== props.member.id) {
    const memberRole =
      await MyGlobal.prisma.discussion_board_members.findUnique({
        where: { id: props.member.id },
        select: { role: true },
      });
    if (memberRole?.role !== "admin" && memberRole?.role !== "superAdmin") {
      throw new HttpException(
        "Forbidden: you don't have permission to modify this article",
        403,
      );
    }
  }
  // Delete the ArticleTag junction record
  await MyGlobal.prisma.discussion_board_article_tags.deleteMany({
    where: {
      article_id: props.articleId,
    },
  });
}
