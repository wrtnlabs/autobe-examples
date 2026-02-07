import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomyPoliticsBoardSearchFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSearchFilter";
import type { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_economy_politics_board_user_filters_create } from "../../../generate/generate_random_economy_politics_board_user_filters_create";
import { prepare_random_economy_politics_board_search_filter } from "../../../prepare/prepare_random_economy_politics_board_search_filter";

export async function test_api_user_filters_deletion_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as user
  const userConnection: api.IConnection = { host: connection.host };
  const user: IEconomyPoliticsBoardUser.IAuthorized = await authorize_user_join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        name: RandomGenerator.name(),
      } satisfies IEconomyPoliticsBoardUser.IJoin,
    },
  );
  // 2. Create a user-owned filter
  const filter: IEconomyPoliticsBoardSearchFilter =
    await generate_random_economy_politics_board_user_filters_create(
      userConnection,
      {
        body: {
          filter_name: RandomGenerator.name(1),
          config: JSON.stringify({
            tags: ["economy", "politics"],
            recent: true,
          }),
        } satisfies IEconomyPoliticsBoardSearchFilter.ICreate,
      },
    );
  typia.assert(filter);
  // 3. Delete the filter
  await api.functional.economyPoliticsBoard.user.filters.erase(userConnection, {
    filterId: filter.id,
  });
}
