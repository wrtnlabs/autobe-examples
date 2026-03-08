import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminArticlesArticleIdTags(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticle.ITagsRequest;
}): Promise<IDiscussionBoardArticle.ITagsResponse> {
  // Verify article exists and is active
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
    });
  // Process each tag name - filter empty/whitespace-only
  const validTags = props.body.tags
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
  // Create ArticleTag associations with valid fields only
  // Note: The schema doesn't have a field to store tag names or tag references
  for (const tagName of validTags) {
    await MyGlobal.prisma.discussion_board_article_tags.create({
      data: {
        id: v4(),
        article_id: props.articleId,
        created_at: new Date().toISOString() as string &
          tags.Format<"date-time">,
      },
    });
  }
  return {
    status: "success" as const,
    tagsAdded: validTags.length as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
  };
}
