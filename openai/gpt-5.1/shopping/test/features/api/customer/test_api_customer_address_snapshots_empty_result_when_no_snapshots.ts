import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerAddressSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddressSnapshot";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";

/**
 * Validate that the customer address snapshot listing returns an empty page
 * when the customer has no historical address snapshots.
 *
 * Business context:
 *
 * - A brand new customer who has just joined the shopping mall should not have
 *   any address snapshots yet, because no orders or address-related flows have
 *   occurred.
 * - The listing endpoint must still work correctly and return a valid paginated
 *   response with an empty data array, without throwing errors.
 *
 * Steps:
 *
 * 1. Register a new customer via POST /auth/customer/join.
 * 2. Without performing any operations that could create address snapshots, call
 *    PATCH /shoppingMall/customer/customers/{customerId}/addressSnapshots with
 *    basic pagination and sorting params, and other filters set to null.
 * 3. Verify that the response indicates zero records and an empty data array while
 *    maintaining consistent pagination metadata.
 */
export async function test_api_customer_address_snapshots_empty_result_when_no_snapshots(
  connection: api.IConnection,
) {
  // 1. Register a new customer via join
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customer);

  const customerId = customer.id;

  // 2. Call addressSnapshots.index for this new customer with null filters
  const page = 1 as number & tags.Type<"int32">;
  const limit = 10 as number & tags.Type<"int32">;

  const requestBody = {
    page,
    limit,
    orderByCreatedAt: "desc",
    createdAtFrom: null,
    createdAtTo: null,
    countryId: null,
    regionId: null,
    searchText: null,
  } satisfies IShoppingMallCustomerAddressSnapshot.IRequest;

  const output: IPageIShoppingMallCustomerAddressSnapshot.ISummary =
    await api.functional.shoppingMall.customer.customers.addressSnapshots.index(
      connection,
      {
        customerId,
        body: requestBody,
      },
    );

  // 3. Validate response type and empty result semantics
  typia.assert<IPageIShoppingMallCustomerAddressSnapshot.ISummary>(output);

  const pagination: IPage.IPagination = output.pagination;

  // Use local values as the first parameter for type-compatibility with TestValidator.equals
  TestValidator.equals(
    "pagination current page equals requested page",
    page,
    pagination.current,
  );
  TestValidator.equals(
    "pagination limit equals requested limit",
    limit,
    pagination.limit,
  );
  TestValidator.equals(
    "pagination total records is zero for new customer",
    0,
    pagination.records,
  );
  TestValidator.predicate(
    "pagination pages is non-negative for empty snapshot result",
    pagination.pages >= 0,
  );
  TestValidator.equals(
    "snapshot list is empty for newly joined customer",
    0,
    output.data.length,
  );
}
