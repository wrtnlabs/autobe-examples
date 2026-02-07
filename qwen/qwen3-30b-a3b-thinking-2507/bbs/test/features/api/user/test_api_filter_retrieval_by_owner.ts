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

export async function test_api_filter_retrieval_by_owner(
  connection: api.IConnection,
) {
  // 1. Create user with generated credentials
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IEconomyPoliticsBoardUser.IJoin,
  });
  // 2. Create filter configuration
  const filter =
    await generate_random_economy_politics_board_user_filters_create(
      userConnection,
      {
        body: {
          filter_name: RandomGenerator.name(2),
          config: JSON.stringify({
            tags: ["economy", "politics"],
            recent: true,
          }),
        } satisfies IEconomyPoliticsBoardSearchFilter.ICreate,
      },
    );
  typia.assert(filter);
  // 3. Retrieve filter by ID
  const retrievedFilter =
    await api.functional.economyPoliticsBoard.user.filters.at(userConnection, {
      filterId: filter.id,
    });
  typia.assert(retrievedFilter);
  // 4. Validate user ownership
  typia.assertGuard(retrievedFilter.user.id);
  // Fixed: checked for null/undefined and type before replace()
  const authorizationHeader = userConnection.headers?.Authorization;
  const userId = (authorizationHeader != null && typeof authorizationHeader === 'string')
    ? authorizationHeader.replace("Bearer ", "")
    : "";
  TestValidator.equals(
    "user_id match",
    retrievedFilter.user.id,
    userId,
  );
  // 5. Validate config structure
  // Fixed: added void to ignore promise warning
  void TestValidator.predicate("config is valid JSON", () => {
    const parsed = JSON.parse(retrievedFilter.config);
    return parsed.tags && parsed.tags.includes("economy") && parsed.recent;
  });
}