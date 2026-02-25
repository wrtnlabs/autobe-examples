import { IEconomicPoliticalDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EconomicPoliticalDiscussionBoardSectionAtSummaryTransformer {
  export type Payload =
    Prisma.economic_political_discussion_board_sectionsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        articles: true,
      },
    } satisfies Prisma.economic_political_discussion_board_sectionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicPoliticalDiscussionBoardSection.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      article_count: input.articles.length,
    };
  }
}
