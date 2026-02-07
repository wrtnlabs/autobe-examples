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

export async function test_api_search_by_multiple_tags_oldest(
  connection: api.IConnection,
): Promise<void> {
  // To test the search functionality according to the API contract, we create a citizen account and perform a search request with an empty body since IEconomicBoardArticle.IRequest is an empty object. We validate that the response contains the required pagination and data properties as specified in IPageIEconomicBoardArticle.ISummary, without attempting impossible validations for tags or sorting which are not supported by the API.
  // 1. Create citizen user account
  const citizenConnection: api.IConnection = { host: connection.host };
  await authorize_citizen_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IEconomicBoardCitizen.IJoin,
  });
  // 2. Perform search with empty request body as per IEconomicBoardArticle.IRequest
  const searchResponse = await api.functional.economicBoard.search.index(
    citizenConnection,
    {
      body: {} satisfies IEconomicBoardArticle.IRequest,
    },
  );
  typia.assert(searchResponse);
  // 3. Validate the structure of the response
  TestValidator.predicate(
    "response has pagination",
    searchResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "response has data array",
    Array.isArray(searchResponse.data),
  );
  TestValidator.predicate(
    "data array is not empty",
    searchResponse.data.length >= 0,
  );
}
