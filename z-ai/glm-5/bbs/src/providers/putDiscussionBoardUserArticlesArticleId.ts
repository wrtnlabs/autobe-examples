import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardArticleTransformer } from "../transformers/DiscussionBoardArticleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardUserArticlesArticleId(props: {
  user: UserPayload;
  articleId: string;
  body: IDiscussionBoardArticle.IUpdate;
}): Promise<IDiscussionBoardArticle> {
  // Find the article with author info for authorization check
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      select: {
        id: true,
        discussion_board_user_id: true,
        deleted_at: true,
      },
    });
  // Authorization: only the author can update
  if (article.discussion_board_user_id !== props.user.id) {
    throw new HttpException("NOT_ARTICLE_OWNER", 403);
  }
  // Get user to check ban status
  const user = await MyGlobal.prisma.discussion_board_users.findUniqueOrThrow({
    where: { id: props.user.id },
    select: { is_banned: true },
  });
  if (user.is_banned) {
    throw new HttpException("USER_BANNED", 403);
  }
  // If sectionId is provided, verify the section exists and is not deleted
  if (props.body.sectionId !== undefined) {
    await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
      where: { id: props.body.sectionId },
    });
  }
  // Build update data with satisfies for type safety
  const updateData = {
    ...(props.body.title !== undefined && { title: props.body.title }),
    ...(props.body.content !== undefined && { content: props.body.content }),
    ...(props.body.sectionId !== undefined && {
      discussion_board_section_id: props.body.sectionId,
    }),
    updated_at: new Date(),
  } satisfies Prisma.discussion_board_articlesUpdateInput;
  // Update the article
  await MyGlobal.prisma.discussion_board_articles.update({
    where: { id: props.articleId },
    data: updateData,
  });
  // Fetch and return the updated article using the transformer
  const updated =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      ...DiscussionBoardArticleTransformer.select(),
    });
  return await DiscussionBoardArticleTransformer.transform(updated);
}
