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
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: {
        id: props.articleId,
        deleted_at: null,
      },
      select: {
        discussion_board_member_id: true,
      },
    });
  if (article.discussion_board_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const tagAssignment =
    await MyGlobal.prisma.discussion_board_article_tags.findFirst({
      where: {
        discussion_board_article_id: props.articleId,
        discussion_board_tag_id: props.tagId,
      },
    });
  if (tagAssignment === null) {
    throw new HttpException("Tag assignment not found", 404);
  }
  await MyGlobal.prisma.discussion_board_article_tags.delete({
    where: {
      id: tagAssignment.id,
    },
  });
}
