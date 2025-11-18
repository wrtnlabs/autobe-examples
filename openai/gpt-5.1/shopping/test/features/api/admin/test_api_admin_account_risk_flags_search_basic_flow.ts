import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAccountRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAccountRiskFlag";
import type { IShoppingMallAccountRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAccountRiskFlag";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

export async function test_api_admin_account_risk_flags_search_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Derive adminId for subsequent search (prefer nested summary if present)
  const adminId: string & tags.Format<"uuid"> = (adminAuthorized.admin?.id ??
    adminAuthorized.id) as string & tags.Format<"uuid">;

  // 2. Create a canonical admin-focused risk flag
  const riskActorType = "admin";
  const riskCode = "SUSPICIOUS_LOGIN_PATTERN";
  const riskSeverity = "high";

  const createRiskFlagBody = {
    actor_type: riskActorType,
    code: riskCode,
    severity: riskSeverity,
    active: true,
    reason: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 4,
      wordMax: 10,
    }),
  } satisfies IShoppingMallAccountRiskFlag.ICreate;

  const createdFlag: IShoppingMallAccountRiskFlag =
    await api.functional.shoppingMall.admin.accountRiskFlags.create(
      connection,
      {
        body: createRiskFlagBody,
      },
    );
  typia.assert(createdFlag);

  // 3. Search risk flags for the admin using the index endpoint with filters
  const requestedPage = 1;
  const requestedLimit = 10;

  const searchBody = {
    page: requestedPage,
    limit: requestedLimit,
    order_by: "created_at",
    order_direction: "desc",
    actor_type: riskActorType,
    severity: riskSeverity,
    active: true,
    code: createdFlag.code,
  } satisfies IShoppingMallAccountRiskFlag.IRequest;

  const pageResult: IPageIShoppingMallAccountRiskFlag.ISummary =
    await api.functional.shoppingMall.admin.admins.accountRiskFlags.index(
      connection,
      {
        adminId,
        body: searchBody,
      },
    );
  typia.assert(pageResult);

  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination current matches requested page",
    pageResult.pagination.current,
    requestedPage,
  );
  TestValidator.equals(
    "pagination limit matches requested limit",
    pageResult.pagination.limit,
    requestedLimit,
  );

  TestValidator.predicate(
    "records count is at least 1",
    pageResult.pagination.records >= 1,
  );

  // 5. Validate that at least one summary matches the created risk flag
  const matchedSummary = pageResult.data.find((summary) => {
    return (
      summary.id === createdFlag.id &&
      summary.actor_type === riskActorType &&
      summary.code === createdFlag.code &&
      summary.severity === createdFlag.severity &&
      summary.active === true
    );
  });

  TestValidator.predicate(
    "search results contain the created admin risk flag",
    matchedSummary !== undefined,
  );

  if (matchedSummary !== undefined) {
    // created_at and updated_at are already type-validated by typia.assert,
    // so here we only check that they are non-empty strings from a business
    // perspective.
    TestValidator.predicate(
      "matched summary has non-empty created_at",
      matchedSummary.created_at.length > 0,
    );
    TestValidator.predicate(
      "matched summary has non-empty updated_at",
      matchedSummary.updated_at.length > 0,
    );
  }
}
