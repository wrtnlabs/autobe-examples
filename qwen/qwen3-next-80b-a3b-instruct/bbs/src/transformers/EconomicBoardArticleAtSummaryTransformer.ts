import { IEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticle";
import { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IEconomicBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EconomicBoardArticleAtSummaryTransformer {
  export type Payload = Prisma.economic_board_articlesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        content: true,
        created_at: true,
        updated_at: true,
        is_deleted: true,
        section: {
          select: {
            id: true,
            name: true,
            description: true,
            created_at: true,
            updated_at: true,
          },
        },
        author: {
          select: {
            id: true,
            email: true,
            display_name: true,
            ban_reason: true,
            created_at: true,
          },
        },
        comments: {
          select: { id: true },
        },
        articleTags: {
          select: { tag: true },
        },
        attachments: true,
        snapshots: true,
        views: true,
      },
    } satisfies Prisma.economic_board_articlesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicBoardArticle.ISummary> {
    return {
      id: input.id,
      title: input.title,
      section: {
        id: input.section.id,
        name: input.section.name,
        description: input.section.description,
        created_at: input.section.created_at.toISOString(),
        updated_at: input.section.updated_at.toISOString(),
      } satisfies IEconomicBoardSection.ISummary,
      author: {
        id: input.author.id,
        email: input.author.email,
        display_name: input.author.display_name ?? undefined,
        ban_reason: input.author.ban_reason ?? null,
        created_at: input.author.created_at.toISOString(),
      } satisfies IEconomicBoardCitizen.ISummary,
      tags: input.articleTags.map((at) => at.tag),
      comment_count: input.comments.length,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
