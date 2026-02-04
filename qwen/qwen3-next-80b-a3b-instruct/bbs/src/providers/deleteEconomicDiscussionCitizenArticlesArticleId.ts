import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEconomicDiscussionCitizenArticlesArticleId(props: {
  citizen: CitizenPayload;
  articleId: string;
}): Promise<void> {
  // Verify article exists and get author information
  const article = await MyGlobal.prisma.economic_discussion_articles.findUnique(
    {
      where: { id: props.articleId },
    },
  );
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  // Verify user is the author or has administration rights (admin check handled by auth layer)
  if (article.author_id !== props.citizen.id) {
    throw new HttpException(
      "Forbidden - You can only delete your own articles",
      403,
    );
  }
  // Delete all associated comments (cascade delete) - use article_id scalar field
  await MyGlobal.prisma.economic_discussion_comments.deleteMany({
    where: { article_id: props.articleId },
  });
  // Delete the article
  await MyGlobal.prisma.economic_discussion_articles.delete({
    where: { id: props.articleId },
  });
}
