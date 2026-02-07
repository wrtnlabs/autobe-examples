import { IEconomyPoliticsBoardSearchQuery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSearchQuery";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EconomyPoliticsBoardSearchQueryCollector {
  export async function collect(props: {
    body: IEconomyPoliticsBoardSearchQuery.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      search_term: props.body.search_term,
      request_parameters: props.body.request_parameters ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.economy_politics_board_search_queriesCreateInput;
  }
}
