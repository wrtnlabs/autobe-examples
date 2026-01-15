import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardArticleCategoryAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_article_categoriesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        created_at: true,
        updated_at: true,
        _count: {
          select: {
            discussion_board_articles: true,
          },
        },
      },
    } satisfies Prisma.discussion_board_article_categoriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticleCategory.ISummary> {
    return {
      id: input.id,
      title: input.name,
      slug: input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
      description: undefined,
      status: "active",
      parent_category_id: undefined,
      article_count: input._count.discussion_board_articles,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      order_index: undefined,
      color_code: undefined,
    };
  }
}
