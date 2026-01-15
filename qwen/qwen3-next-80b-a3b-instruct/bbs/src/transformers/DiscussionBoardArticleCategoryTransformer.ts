import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardArticleCategoryTransformer {
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
        discussion_board_articles: true,
      },
    } satisfies Prisma.discussion_board_article_categoriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticleCategory> {
    return {
      id: input.id,
      name: input.name,
      created_at: input.created_at.toISOString(),
    };
  }
}
