import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRiskCase";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";

export async function test_api_risk_case_search_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain an authorized admin context and token
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create at least one risk case as the authenticated admin
  const riskCaseCreateBodyRandom =
    typia.random<IShoppingMallRiskCase.ICreate>();
  // Override some key fields for easier deterministic filtering
  const riskCaseCreateBody = {
    ...riskCaseCreateBodyRandom,
    case_code: RandomGenerator.alphaNumeric(12),
    status: "open",
    severity: "high",
  } satisfies IShoppingMallRiskCase.ICreate;

  const createdRiskCase =
    await api.functional.shoppingMall.admin.riskCases.create(connection, {
      body: riskCaseCreateBody,
    });
  typia.assert<IShoppingMallRiskCase>(createdRiskCase);

  // 3. Build a deterministic search request that should match the created case
  const searchRequestBody = {
    page: 1,
    limit: 10,
    caseCode: createdRiskCase.case_code,
  } satisfies IShoppingMallRiskCase.IRequest;

  // 4. Attempt search without admin authentication
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated risk case search must fail",
    async () => {
      await api.functional.shoppingMall.admin.riskCases.index(
        unauthConnection,
        {
          body: searchRequestBody,
        },
      );
    },
  );

  // 5. Authenticated search should succeed and return the created case
  const searchResult = await api.functional.shoppingMall.admin.riskCases.index(
    connection,
    {
      body: searchRequestBody,
    },
  );
  typia.assert<IPageIShoppingMallRiskCase.ISummary>(searchResult);

  // Assert pagination and data
  TestValidator.predicate(
    "risk case search results should contain at least one record",
    searchResult.pagination.records >= 1,
  );
  TestValidator.predicate(
    "risk case search list must be non-empty",
    searchResult.data.length > 0,
  );

  // Ensure that at least one of the returned summaries matches the created case code
  const hasCreatedCase = searchResult.data.some(
    (summary) => summary.case_code === createdRiskCase.case_code,
  );
  TestValidator.predicate(
    "risk case search results must include the created case",
    hasCreatedCase,
  );
}
