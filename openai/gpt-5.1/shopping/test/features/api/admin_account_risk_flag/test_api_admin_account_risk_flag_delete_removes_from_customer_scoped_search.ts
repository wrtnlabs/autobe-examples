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

export async function test_api_admin_account_risk_flag_delete_removes_from_customer_scoped_search(
  connection: api.IConnection,
) {
  // 1. Admin joins (registers) and obtains authorization context via token
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a new risk flag targeted at customers
  const createBody = {
    actor_type: "customer",
    code: RandomGenerator.alphabets(8),
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    severity: RandomGenerator.pick([
      "low",
      "medium",
      "high",
      "critical",
    ] as const),
    active: true,
    expires_at: null,
  } satisfies IShoppingMallAccountRiskFlag.ICreate;

  const createdFlag: IShoppingMallAccountRiskFlag =
    await api.functional.shoppingMall.admin.accountRiskFlags.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdFlag);

  // 3. Use a synthetic customerId to search customer-scoped risk flags and
  // confirm the created flag is present in the results.
  //
  // We cannot actually link a real customer due to missing APIs, so we treat
  // the customer-scoped search as a generic paginated filter that should be
  // capable of returning the created flag ID when filters match.
  const syntheticCustomerId = typia.random<string & tags.Format<"uuid">>();

  const initialSearchBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    order_by: "created_at",
    order_direction: "desc",
    actor_type: "customer",
    severity: undefined,
    active: true,
    code: createdFlag.code,
    created_from: undefined,
    created_to: undefined,
  } satisfies IShoppingMallAccountRiskFlag.IRequest;

  const initialPage: IPageIShoppingMallAccountRiskFlag.ISummary =
    await api.functional.shoppingMall.admin.customers.accountRiskFlags.index(
      connection,
      {
        customerId: syntheticCustomerId,
        body: initialSearchBody,
      },
    );
  typia.assert(initialPage);

  const initiallyContains = initialPage.data.some(
    (summary) => summary.id === createdFlag.id,
  );

  TestValidator.predicate(
    "created risk flag should be present in customer-scoped search before deletion (if search surface is consistent)",
    initiallyContains,
  );

  // 4. Delete the risk flag using the admin erase endpoint
  await api.functional.shoppingMall.admin.accountRiskFlags.erase(connection, {
    riskFlagId: createdFlag.id,
  });

  // 5. Re-run the customer-scoped search and ensure the deleted flag is no
  // longer present in the results
  const afterDeletePage: IPageIShoppingMallAccountRiskFlag.ISummary =
    await api.functional.shoppingMall.admin.customers.accountRiskFlags.index(
      connection,
      {
        customerId: syntheticCustomerId,
        body: initialSearchBody,
      },
    );
  typia.assert(afterDeletePage);

  const afterDeleteContains = afterDeletePage.data.some(
    (summary) => summary.id === createdFlag.id,
  );

  TestValidator.predicate(
    "deleted risk flag should not appear in customer-scoped search after deletion",
    !afterDeleteContains,
  );
}
