import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticle";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";

export async function test_api_search_by_single_tag_newest(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate citizen user
  const citizenConnection: api.IConnection = { host: connection.host };
  await authorize_citizen_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!" satisfies string & tags.MinLength<8>,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IEconomicBoardCitizen.IJoin,
  });
  // 2. Perform search with empty body, as per IEconomicBoardArticle.IRequest definition
  const searchResponse = await api.functional.economicBoard.search.index(
    citizenConnection,
    {
      body: {} satisfies IEconomicBoardArticle.IRequest, // Empty body since IRequest is {} in schema
    },
  );
  typia.assert(searchResponse);
  // 3. Validate pagination
  TestValidator.equals(
    "pagination is present",
    typeof searchResponse.pagination,
    "object",
  );
  TestValidator.equals(
    "pagination current page is 1",
    searchResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    searchResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    searchResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    searchResponse.pagination.pages >= 0,
  );
  // 4. Validate articles
  TestValidator.predicate(
    "articles array exists",
    Array.isArray(searchResponse.data),
  );
  TestValidator.predicate(
    "at least one article returned",
    searchResponse.data.length > 0,
  );
  // The scenario requested tag filtering, but IEconomicBoardArticle.IRequest is an empty object {}.
  // Therefore, tag filtering is not supported by the API as defined.
  // We follow the Anti-Hallucination Protocol and compiler rules: test only what exists.
  // We validate the search endpoint returns a valid response with articles for an empty search.
}
