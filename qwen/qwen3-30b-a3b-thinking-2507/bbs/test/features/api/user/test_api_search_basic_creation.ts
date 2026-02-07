import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomyPoliticsBoardSearchQuery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSearchQuery";
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
import { generate_random_economy_politics_board_user_queries_create } from "../../../generate/generate_random_economy_politics_board_user_queries_create";
import { prepare_random_economy_politics_board_search_query } from "../../../prepare/prepare_random_economy_politics_board_search_query";

export async function test_api_search_basic_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration via utility function
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IEconomyPoliticsBoardUser.IJoin,
  });
  // 2. Create search query with minimum valid search term (1 character)
  const searchQuery =
    await generate_random_economy_politics_board_user_queries_create(
      userConnection,
      {
        body: {
          search_term: "a",
          request_parameters: JSON.stringify({
            page: 1,
            size: 20,
          }),
        } satisfies IEconomyPoliticsBoardSearchQuery.ICreate,
      },
    );
  // 3. Validate search term and timestamps
  TestValidator.equals(
    "search term matches input",
    searchQuery.searchTerm,
    "a",
  );
  TestValidator.predicate(
    "has valid creation timestamp",
    searchQuery.createdAt !== "",
  );
  TestValidator.predicate(
    "has valid update timestamp",
    searchQuery.updatedAt !== "",
  );
}
