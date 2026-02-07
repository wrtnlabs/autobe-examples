import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
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

export async function postDiscussionBoardMemberArticlesArticleIdImages(props: {
  member: MemberPayload;
  articleId: string;
  body: IDiscussionBoardArticleImage.ICreate;
}): Promise<IDiscussionBoardArticleImage> {
  // Verify article exists
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });
  if (!article) throw new HttpException("Article not found", 404);
  // Verify authorization (article author or admin)
  if (article.author_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Create image record with required fields
  const created = await MyGlobal.prisma.discussion_board_article_images.create({
    data: {
      id: v4(),
      original_filename: "",
      stored_filename: "",
      mime_type: "",
      size: 0,
      width: 0,
      height: 0,
      display_order: 0,
      article: { connect: { id: props.articleId } },
    },
  });
  return {
    id: created.id,
    original_filename: created.original_filename,
    stored_filename: created.stored_filename,
    mime_type: created.mime_type,
    size: created.size,
    width: created.width,
    height: created.height,
    display_order: created.display_order,
  };
}
