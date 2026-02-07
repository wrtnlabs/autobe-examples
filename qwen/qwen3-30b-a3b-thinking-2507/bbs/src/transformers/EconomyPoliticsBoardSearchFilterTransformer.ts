import { IEconomyPoliticsBoardSearchFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSearchFilter";
import { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EconomyPoliticsBoardUserAtSummaryTransformer } from "./EconomyPoliticsBoardUserAtSummaryTransformer";

export namespace EconomyPoliticsBoardSearchFilterTransformer {
  export type Payload = Prisma.economy_politics_board_search_filtersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        filter_name: true,
        description: true,
        config: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: EconomyPoliticsBoardUserAtSummaryTransformer.select(),
      },
    } satisfies Prisma.economy_politics_board_search_filtersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomyPoliticsBoardSearchFilter> {
    return {
      config: input.config,
      id: input.id,
      filter_name: input.filter_name,
      description: input.description ?? null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      user: await EconomyPoliticsBoardUserAtSummaryTransformer.transform(
        input.user,
      ),
    };
  }
}
