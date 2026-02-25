import { IEconomicBoardArticleView } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticleView";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EconomicBoardArticleViewAtSummaryTransformer {
  export type Payload = Prisma.economic_board_article_viewsGroupByArgs;
  export function groupBy() {
    return {
      groupBy: {
        article_id: true,
      },
      _count: {
        id: true,
        user_id: true,
      },
      _min: {
        created_at: true,
      },
      _max: {
        created_at: true,
      },
      where: {
        article: {
          is_deleted: false,
        },
      },
    } satisfies Prisma.economic_board_article_viewsGroupByArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicBoardArticleView.ISummary> {
    return {
      article_id: input.article_id,
      view_count: input._count.id,
      first_view:
        input._min.created_at?.toISOString() ??
        new Date("2300-01-01").toISOString(),
      last_view:
        input._max.created_at?.toISOString() ??
        new Date("2300-01-01").toISOString(),
      total_unique_users: input._count.user_id,
    };
  }
}
