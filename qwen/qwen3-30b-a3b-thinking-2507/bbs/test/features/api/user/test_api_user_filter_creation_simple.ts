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

export async function test_api_user_filter_creation_simple(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as user
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {} satisfies IEconomyPoliticsBoardUser.IJoin,
  });
  // 2. Create filter with name 'Recent Articles' and config for recent articles
  const filter =
    await generate_random_economy_politics_board_user_filters_create(
      userConnection,
      {
        body: {
          filter_name: "Recent Articles",
          config: JSON.stringify({ recent: true }),
        } satisfies IEconomyPoliticsBoardSearchFilter.ICreate,
      },
    );
  typia.assert(filter);
  // 3. Verify filter properties
  TestValidator.equals(
    "filter name matches",
    filter.filter_name,
    "Recent Articles",
  );
  TestValidator.equals(
    "config matches",
    JSON.stringify({ recent: true }),
    filter.config,
  );
}
