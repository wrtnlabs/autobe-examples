import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerAddress";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test filtering customer addresses by default status through admin API.
 *
 * Validates the address filtering functionality by testing is_default filter parameter with true and false values. Ensures that filtering correctly returns only addresses matching the specified default status and that pagination metadata accurately reflects filtered result counts.
 *
 * The test covers administrator authentication, filter application with is_default=true (expecting at most one default address per customer), and is_default=false (expecting all non-default addresses). Verifies response structure conforms to IPageIShoppingMallCustomerAddress.ISummary with valid pagination information.
 *
 * 1. Administrator creates account and authenticates for address management access.
 * 2. Generates customer UUID for address retrieval testing.
 * 3. Tests is_default=true filter: validates at most one result and all results have is_default=true.
 * 4. Tests is_default=false filter: validates all results have is_default=false.
 * 5. Verifies pagination metadata correctly reflects filtered counts for both queries.
 */
export async function test_api_customer_address_filter_by_default_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Generate customer UUID for testing
  const customerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Test is_default=true filter (should return at most 1 default address)
  const defaultAddresses =
    await api.functional.shoppingMall.admin.customers.addresses.index(
      adminConnection,
      {
        customerId,
        body: {
          is_default: true,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCustomerAddress.IRequest,
      },
    );
  typia.assert(defaultAddresses);
  // Validate default address filter results
  TestValidator.predicate(
    "default address count is 0 or 1",
    defaultAddresses.pagination.records <= 1,
  );
  TestValidator.predicate(
    "all returned addresses are default",
    defaultAddresses.data.every((addr) => addr.is_default === true),
  );
  TestValidator.equals(
    "pagination records matches data length",
    defaultAddresses.pagination.records,
    defaultAddresses.data.length,
  );
  // 4. Test is_default=false filter (should return non-default addresses)
  const nonDefaultAddresses =
    await api.functional.shoppingMall.admin.customers.addresses.index(
      adminConnection,
      {
        customerId,
        body: {
          is_default: false,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCustomerAddress.IRequest,
      },
    );
  typia.assert(nonDefaultAddresses);
  // Validate non-default address filter results
  TestValidator.predicate(
    "all returned addresses are non-default",
    nonDefaultAddresses.data.every((addr) => addr.is_default === false),
  );
  TestValidator.equals(
    "pagination records matches data length",
    nonDefaultAddresses.pagination.records,
    nonDefaultAddresses.data.length,
  );
  // 5. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination current page is 1",
    defaultAddresses.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    defaultAddresses.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    defaultAddresses.pagination.pages >= 0,
  );
}
