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

export async function test_api_search_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create a citizen account
  const citizenConnection: api.IConnection = { host: connection.host };
  const testEmail = typia.random<string & tags.Format<"email">>();
  const joinResponse = await authorize_citizen_join(citizenConnection, {
    body: {
      email: testEmail,
      password: "SecurePass123!", // Meets MinLength<8>
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IEconomicBoardCitizen.IJoin,
  });
  typia.assert(joinResponse);
  // Use the obtained email to log in and get an active session
  const loginResponse = await authorize_citizen_login(citizenConnection, {
    body: {
      email: testEmail, // Use original email, not ID
      password: "SecurePass123!",
    } satisfies IEconomicBoardCitizen.ILogin,
  });
  typia.assert(loginResponse);
  // IEconomicBoardArticle.IRequest is empty object, so we pass {}
  // Per instruction 5.3: If scenario impossible → rewrite using available APIs
  // We cannot search for 'market' or set pagination because IRequest has no fields
  // We must use {} as body to comply with schema
  const searchBody: IEconomicBoardArticle.IRequest = {};
  // Call search API
  const result = await api.functional.economicBoard.search.index(
    citizenConnection,
    {
      body: searchBody,
    },
  );
  typia.assert(result);
  // Validate the structure and constraints of pagination metadata
  TestValidator.predicate(
    "current page is positive",
    result.pagination.current >= 1,
  );
  TestValidator.predicate("limit is positive", result.pagination.limit >= 1);
  TestValidator.predicate(
    "records count is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    result.pagination.pages >= 0,
  );
  TestValidator.predicate("data is an array", Array.isArray(result.data));
}
