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

export async function test_api_user_filter_update_partial_config(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as user
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {} satisfies IEconomyPoliticsBoardUser.IJoin,
  });
  // 2. Create initial filter with random config
  const initialFilter =
    await generate_random_economy_politics_board_user_filters_create(
      userConnection,
      {
        body: {
          filter_name: typia.random<string & tags.MinLength<1>>(),
          config: JSON.stringify({
            tags: [RandomGenerator.name(), RandomGenerator.name()],
            recent: true,
          }),
        } satisfies IEconomyPoliticsBoardSearchFilter.ICreate,
      },
    );
  // 3. Update just the config (IUpdate is empty, so we don't need to specify any parameters)
  const updatedFilter =
    await api.functional.economyPoliticsBoard.user.filters.update(
      userConnection,
      {
        filterId: initialFilter.id,
        body: {
          config: JSON.stringify({
            ...JSON.parse(initialFilter.config),
            recent: false,
          }),
        } satisfies IEconomyPoliticsBoardSearchFilter.IUpdate,
      },
    );
  typia.assert(updatedFilter);
  // 4. Validate config was updated
  TestValidator.equals(
    "Config is updated correctly",
    JSON.parse(updatedFilter.config).recent,
    false,
  );
  TestValidator.equals(
    "Filter name remains unchanged",
    updatedFilter.filter_name,
    initialFilter.filter_name,
  );
}
