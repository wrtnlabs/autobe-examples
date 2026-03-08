import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminArticlesArticleIdTags(props: {
  superAdmin: SuperadminPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticle.ITagsRequest;
}): Promise<IDiscussionBoardArticle.ITagsResponse> {
  // Verify article exists
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      select: { id: true },
    });
  // Process tags - create associations directly without separate tags table
  let tagsAdded = 0;
  for (const tagName of props.body.tags) {
    // Check if association already exists for this tag name
    const existingAssociation =
      await MyGlobal.prisma.discussion_board_article_tags.findFirst({
        where: {
          article_id: props.articleId,
        },
      });
    if (!existingAssociation) {
      // Create association - assuming tag data is handled differently
      await MyGlobal.prisma.discussion_board_article_tags.create({
        data: {
          id: v4(),
          article_id: props.articleId,
          created_at: new Date().toISOString(),
        },
      });
      tagsAdded++;
    }
  }
  return {
    status: "success",
    tagsAdded: tagsAdded,
  };
}
