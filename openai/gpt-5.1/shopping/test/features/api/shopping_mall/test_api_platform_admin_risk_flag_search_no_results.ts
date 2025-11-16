import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRiskFlag";
import type { IShoppingMallAuthCredentials } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthCredentials";
import type { IShoppingMallAuthCredentialsActor } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthCredentialsActor";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskFlag";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_platform_admin_risk_flag_search_no_results(
  connection: api.IConnection,
) {
  /**
   * 1. Join as a platform administrator to obtain an authorized connection.
   *
   *    - Uses api.functional.auth.platformAdmin.join
   *    - Ensures Authorization header is set by SDK; test code must not manipulate
   *         headers directly.
   */
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/login",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  /**
   * 2. Prepare a fresh authCredentialsId for which we will first search, expecting
   *    zero risk flags.
   *
   *    In this E2E we focus on the behavior of the risk flag search endpoint: when
   *    there are no flags associated with a given credentials id, the response
   *    must be an empty page with coherent pagination metadata.
   */
  const authCredentialsId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  /**
   * 3. First search: expect no results for this authCredentialsId.
   *
   *    We send a simple IRequest with explicit page/limit and without any
   *    restrictive filters. Since there are no flags for this credentials id
   *    yet, we must get an empty data array and coherent pagination values.
   */
  const emptySearchBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallRiskFlag.IRequest;

  const emptyPage: IPageIShoppingMallRiskFlag.ISummary =
    await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.index(
      connection,
      {
        authCredentialsId,
        body: emptySearchBody,
      },
    );
  typia.assert<IPageIShoppingMallRiskFlag.ISummary>(emptyPage);

  // Validate no results and coherent pagination when there are zero records.
  TestValidator.equals(
    "no results: records must be 0",
    0,
    emptyPage.pagination.records,
  );
  TestValidator.equals(
    "no results: pages must be 0 when records = 0",
    0,
    emptyPage.pagination.pages,
  );
  TestValidator.equals(
    "no results: current page index must be 0 when empty",
    0,
    emptyPage.pagination.current,
  );
  TestValidator.equals(
    "no results: data array should be empty",
    0,
    emptyPage.data.length,
  );

  /**
   * 4. Create a risk flag for the same authCredentialsId.
   *
   *    We construct an IShoppingMallRiskFlag.ICreate payload with deterministic
   *    strings so we can later verify that the created flag appears in the
   *    search results. expiresAt is explicitly set to null to exercise nullable
   *    handling.
   */
  const createBody = {
    code: "test_no_results_flag",
    reasonCategory: "test_reason",
    riskLevel: "critical",
    message: RandomGenerator.paragraph({ sentences: 4 }),
    active: true,
    expiresAt: null,
    notes: "created-from-no-results-e2e",
  } satisfies IShoppingMallRiskFlag.ICreate;

  const createdFlag: IShoppingMallRiskFlag =
    await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.create(
      connection,
      {
        authCredentialsId,
        body: createBody,
      },
    );
  typia.assert<IShoppingMallRiskFlag>(createdFlag);

  // Sanity check: the created flag's authCredentialsId must align with path id.
  TestValidator.equals(
    "created flag: authCredentialsId must match path parameter",
    authCredentialsId,
    createdFlag.authCredentialsId,
  );

  /**
   * 5. Second search: expect at least one result now that we have created a flag
   *    for this authCredentialsId.
   *
   *    We use the same page/limit but with no filters so that all flags under this
   *    credentials id are returned. Then we assert that there is at least one
   *    record and that one of them matches the created flag id.
   */
  const secondSearchBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallRiskFlag.IRequest;

  const pageWithData: IPageIShoppingMallRiskFlag.ISummary =
    await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.index(
      connection,
      {
        authCredentialsId,
        body: secondSearchBody,
      },
    );
  typia.assert<IPageIShoppingMallRiskFlag.ISummary>(pageWithData);

  // There must now be at least one record.
  TestValidator.predicate(
    "after creating a flag: records should be >= 1",
    pageWithData.pagination.records >= 1,
  );
  TestValidator.predicate(
    "after creating a flag: data.length should be >= 1",
    pageWithData.data.length >= 1,
  );

  // Ensure that the created flag appears in the page data.
  const found = pageWithData.data.some(
    (summary) => summary.id === createdFlag.id,
  );
  TestValidator.predicate(
    "after creating a flag: created flag id should exist in search results",
    found,
  );

  // Optionally, verify that the summary uses the same auth credentials id.
  const matchingSummary = pageWithData.data.find(
    (summary) => summary.id === createdFlag.id,
  );
  if (matchingSummary) {
    TestValidator.equals(
      "summary.shopping_mall_auth_credentials_id must equal authCredentialsId",
      authCredentialsId,
      matchingSummary.shopping_mall_auth_credentials_id,
    );
  }
}
