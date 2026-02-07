import { IEconomyPoliticsBoardSearchFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSearchFilter";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EconomyPoliticsBoardSearchFilterCollector {
  export async function collect(props: {
    body: IEconomyPoliticsBoardSearchFilter.ICreate;
    economyPoliticsBoardUsers: IEntity;
    economyPoliticsBoardUserSessions: IEntity;
  }) {
    const id = v4();
    return {
      id,
      filter_name: props.body.filter_name,
      config: props.body.config,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      user: { connect: { id: props.economyPoliticsBoardUsers.id } },
    } satisfies Prisma.economy_politics_board_search_filtersCreateInput;
  }
}
