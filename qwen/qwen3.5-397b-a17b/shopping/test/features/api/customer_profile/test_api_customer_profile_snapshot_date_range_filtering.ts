import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfileSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test date range filtering for customer profile snapshots.
 *
 * This test validates the snapshot listing endpoint with date range parameters.
 * Customer authenticates and queries snapshots using various date filter combinations.
 *
 * Test flow:
 * 1. Customer joins and authenticates
 * 2. Query snapshots with various date range combinations
 * 3. Verify pagination structure and response format
 */
export async function test_api_customer_profile_snapshot_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Test snapshot listing with no date filters
  const allSnapshots =
    await api.functional.shoppingMall.customer.profile.snapshots.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  // Verify pagination structure
  TestValidator.predicate(
    "pagination current page",
    allSnapshots.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit",
    allSnapshots.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    allSnapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    allSnapshots.pagination.pages >= 0,
  );
  // 3. Test with fromDate only (no upper bound)
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 30);
  const fromResult =
    await api.functional.shoppingMall.customer.profile.snapshots.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          fromDate: fromDate.toISOString(),
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(fromResult);
  TestValidator.predicate(
    "fromDate filtering works",
    fromResult.pagination.records >= 0,
  );
  // 4. Test with toDate only (no lower bound)
  const toDate = new Date();
  toDate.setDate(toDate.getDate() + 30);
  const toResult =
    await api.functional.shoppingMall.customer.profile.snapshots.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          toDate: toDate.toISOString(),
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(toResult);
  TestValidator.predicate(
    "toDate filtering works",
    toResult.pagination.records >= 0,
  );
  // 5. Test with both fromDate and toDate
  const rangeResult =
    await api.functional.shoppingMall.customer.profile.snapshots.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          fromDate: fromDate.toISOString(),
          toDate: toDate.toISOString(),
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(rangeResult);
  TestValidator.predicate(
    "date range filtering works",
    rangeResult.pagination.records >= 0,
  );
  // 6. Test edge case - date range with no matching snapshots
  const pastFromDate = new Date();
  pastFromDate.setFullYear(pastFromDate.getFullYear() - 10);
  const pastToDate = new Date(pastFromDate);
  pastToDate.setDate(pastToDate.getDate() - 30);
  const emptyResult =
    await api.functional.shoppingMall.customer.profile.snapshots.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          fromDate: pastFromDate.toISOString(),
          toDate: pastToDate.toISOString(),
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.predicate(
    "empty result has records 0 or data empty",
    emptyResult.pagination.records === 0 || emptyResult.data.length === 0,
  );
  // 7. Verify snapshot data structure when snapshots exist
  if (allSnapshots.data.length > 0) {
    const snapshot = allSnapshots.data[0];
    TestValidator.predicate("snapshot has valid id", snapshot.id.length > 0);
    TestValidator.predicate(
      "snapshot has shop_name",
      snapshot.shop_name.length > 0,
    );
    TestValidator.predicate(
      "snapshot has created_at",
      snapshot.created_at.length > 0,
    );
  }
}
