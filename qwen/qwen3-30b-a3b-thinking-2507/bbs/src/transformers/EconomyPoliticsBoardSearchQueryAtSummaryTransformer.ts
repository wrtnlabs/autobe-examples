import { IEconomyPoliticsBoardSearchQuery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSearchQuery";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EconomyPoliticsBoardSearchQueryAtSummaryTransformer {
  export type Payload = Prisma.economy_politics_board_search_queriesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        search_term: true,
        created_at: true,
        request_parameters: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.economy_politics_board_search_queriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomyPoliticsBoardSearchQuery.ISummary> {
    return {
      id: input.id,
      search_term: input.search_term,
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
