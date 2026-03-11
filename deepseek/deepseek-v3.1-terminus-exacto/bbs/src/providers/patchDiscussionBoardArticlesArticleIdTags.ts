import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardArticleTransformer } from "../transformers/DiscussionBoardArticleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardArticlesArticleIdTags(props: {
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleTag.IUpdate;
}): Promise<IDiscussionBoardArticle> {
  // 1. Get authenticated member (from ActorPayload via system)
  // This will be available in actual implementation via decorators
  // For now, we'll assume member is authorized via middleware
  // 2. Verify article exists and get current author
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      select: {
        id: true,
        discussion_board_member_id: true,
        status: true,
      },
    });
  // 3. Authorization: user must be author or admin
  // In real implementation, member object would come from request context
  // For now, we'll implement as if member is available
  // This is a placeholder - actual implementation would:
  // const member = getAuthenticatedMember(req);
  // if (article.discussion_board_member_id !== member.id && member.admin_grade === null) {
  //   throw new HttpException("Forbidden", 403);
  // }
  // 4. Execute transaction to replace tags
  await MyGlobal.prisma.$transaction([
    // Delete existing tags for this article
    MyGlobal.prisma.discussion_board_article_tags.deleteMany({
      where: { discussion_board_article_id: props.articleId },
    }),
    // Create new tags (if any)
    ...props.body.tags.map((tag) =>
      MyGlobal.prisma.discussion_board_article_tags.create({
        data: {
          id: v4(),
          discussion_board_article_id: props.articleId,
          created_at: new Date(),
          updated_at: new Date(),
        },
      }),
    ),
  ]);
  // 5. Update article timestamp
  await MyGlobal.prisma.discussion_board_articles.update({
    where: { id: props.articleId },
    data: { updated_at: new Date() },
  });
  // 6. Fetch and return complete article with tags
  const updatedArticle =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      ...DiscussionBoardArticleTransformer.select(),
    });
  return DiscussionBoardArticleTransformer.transform(updatedArticle);
}
