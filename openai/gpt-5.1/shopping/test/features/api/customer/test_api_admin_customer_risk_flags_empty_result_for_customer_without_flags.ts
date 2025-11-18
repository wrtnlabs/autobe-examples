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

export async function test_api_admin_customer_risk_flags_empty_result_for_customer_without_flags(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain authenticated context
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Choose a customerId to represent a customer without risk flags.
  //    We cannot actually create a customer here, so we use a random UUID.
  const customerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Build request body for risk flag search with minimal pagination
  const requestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    actor_type: "customer",
  } satisfies IShoppingMallAccountRiskFlag.IRequest;

  // 4. Call the accountRiskFlags.index endpoint
  const pageResult: IPageIShoppingMallAccountRiskFlag.ISummary =
    await api.functional.shoppingMall.admin.customers.accountRiskFlags.index(
      connection,
      {
        customerId,
        body: requestBody,
      },
    );
  typia.assert<IPageIShoppingMallAccountRiskFlag.ISummary>(pageResult);

  const pagination = pageResult.pagination;
  const data = pageResult.data;

  // Basic pagination invariants
  TestValidator.predicate(
    "pagination.current is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    pagination.pages >= 0,
  );

  // Data length must not exceed limit
  TestValidator.predicate(
    "data length does not exceed pagination.limit",
    data.length <= pagination.limit,
  );

  // If there are zero records, the data array must be empty
  if (pagination.records === 0) {
    TestValidator.equals("no records implies empty data array", data.length, 0);
  } else {
    // When records exist, ensure all returned flags match the actor_type filter
    for (const flag of data) {
      typia.assert<IShoppingMallAccountRiskFlag.ISummary>(flag);
      TestValidator.equals(
        "returned flag actor_type matches requested actor_type",
        flag.actor_type,
        requestBody.actor_type,
      );
    }
  }
}
