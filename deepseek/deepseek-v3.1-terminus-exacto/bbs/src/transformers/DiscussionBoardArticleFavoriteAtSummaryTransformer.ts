import { IDiscussionBoardArticleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFavorite";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardMemberAtSummaryTransformer } from "./DiscussionBoardMemberAtSummaryTransformer";

export namespace DiscussionBoardArticleFavoriteAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_article_favoritesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        category: true,
        notes: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: true,
        article: {
          select: {
            id: true,
            title: true,
            created_at: true,
            author: DiscussionBoardMemberAtSummaryTransformer.select(),
          },
        } satisfies Prisma.discussion_board_articlesFindManyArgs,
      },
    } satisfies Prisma.discussion_board_article_favoritesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticleFavorite.ISummary> {
    return {
      id: input.id,
      category: input.category ?? undefined,
      notes: input.notes ?? undefined,
      created_at: input.created_at.toISOString(),
      article: {
        title: input.article.title,
        created_at: input.article.created_at.toISOString(),
        author: await DiscussionBoardMemberAtSummaryTransformer.transform(
          input.article.author,
        ),
      },
    };
  }
}
