import { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EconomicPoliticalBoardSectionAtSummaryTransformer {
  export type Payload = Prisma.economic_political_board_sectionsGetPayload<{
    select: {
      id: true;
      name: true;
      description: true;
      created_at: true;
      updated_at: true;
      deleted_at: true;
      articles: {
        select: {};
      };
      _count: {
        select: {
          articles: true;
        };
      };
    };
  }>;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        articles: {
          select: {},
        } satisfies Prisma.economic_political_board_articlesFindManyArgs,
        _count: { select: { articles: true } },
      },
    } satisfies Prisma.economic_political_board_sectionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicPoliticalBoardSection.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      created_at: input.created_at.toISOString(),
      articleCount: input._count.articles,
    };
  }
}
