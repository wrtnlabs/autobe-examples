import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTag";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardArticlesArticleIdTags(props: {
  articleId: string;
  body: IDiscussionBoardArticleTag.IUpdate;
}): Promise<IPageIDiscussionBoardTag.ISummary> {
  // 1. Verify article exists
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: props.articleId },
  });
  // 2. Parse tags from value (comma-separated string)
  const rawTags: string[] = props.body.value
    ? props.body.value
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
    : [];
  // 3. Normalize to lowercase and remove duplicates
  const normalizedTags = [...new Set(rawTags.map((t) => t.toLowerCase()))];
  // 4. Validate tag count (max 15)
  if (normalizedTags.length > 15) {
    throw new HttpException("Maximum 15 tags allowed per article", 400);
  }
  // 5. Validate each tag format
  const tagPattern = /^[a-z0-9_-]+$/;
  for (const tag of normalizedTags) {
    if (tag.length < 1 || tag.length > 50) {
      throw new HttpException("Each tag must be 1-50 characters", 400);
    }
    if (!tagPattern.test(tag)) {
      throw new HttpException(
        "Tags can only contain alphanumeric characters, hyphens, and underscores",
        400,
      );
    }
  }
  // 6. Transaction: delete old tags and insert new ones
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Delete existing article-tag associations
    await tx.discussion_board_article_tags.deleteMany({
      where: { discussion_board_article_id: props.articleId },
    });
    // Create or find tags and create associations
    for (const tagValue of normalizedTags) {
      // Upsert tag (create if not exists, reuse existing)
      const tag = await tx.discussion_board_tags.upsert({
        where: { value: tagValue },
        create: {
          id: v4(),
          value: tagValue,
          created_at: new Date(),
          updated_at: new Date(),
        },
        update: {
          updated_at: new Date(),
        },
      });
      // Create article-tag association
      await tx.discussion_board_article_tags.create({
        data: {
          id: v4(),
          discussion_board_article_id: props.articleId,
          discussion_board_tag_id: tag.id,
          created_at: new Date(),
        },
      });
    }
  });
  // 7. Fetch and return updated tags
  const articleTags =
    await MyGlobal.prisma.discussion_board_article_tags.findMany({
      where: { discussion_board_article_id: props.articleId },
      select: {
        tag: {
          select: {
            id: true,
            value: true,
          },
        },
      },
    });
  const data: IDiscussionBoardTag.ISummary[] = articleTags.map((at) => ({
    id: at.tag.id as string & tags.Format<"uuid">,
    value: at.tag.value,
  }));
  return {
    data,
    pagination: {
      current: 1,
      limit: 100,
      records: data.length,
      pages: 1,
    } satisfies IPage.IPagination,
  } satisfies IPageIDiscussionBoardTag.ISummary;
}
