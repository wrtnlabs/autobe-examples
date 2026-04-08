import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerProfile";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that an authenticated customer can search specifically for pending seller profiles to monitor approval queue.
 *
 * Validates the profile search functionality with approval status filtering for seller profiles. The test verifies that customers can filter seller profiles by their approval status (pending, approved, rejected) and that the search returns only matching profiles with correct seller-specific fields.
 *
 * Special attention is given to verifying that the approval_status filter correctly filters seller profiles while excluding customer profiles, and that seller-specific fields like shop_name, logo_uri, and is_suspended are present in the response.
 *
 * 1. Customer registers and authenticates using authorize_customer_join utility.
 * 2. Search for seller profiles with approval_status='pending'.
 * 3. Verify all returned profiles have profile_type='seller' and approval_status='pending'.
 * 4. Search for seller profiles with approval_status='approved'.
 * 5. Verify all returned profiles have approval_status='approved'.
 * 6. Search for seller profiles with approval_status='rejected'.
 * 7. Verify all returned profiles have approval_status='rejected'.
 * 8. Search with approval_status='pending' without profile_type filter.
 * 9. Verify only seller profiles are returned (approval_status applies only to sellers).
 * 10. Validate pagination metadata is correct for all search results.
 */
export async function test_api_profile_search_pending_sellers(
  connection: api.IConnection,
) {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {},
  });
  // 2. Search for pending seller profiles
  const pendingSearch =
    await api.functional.shoppingMall.customer.profiles.index(
      customerConnection,
      {
        body: {
          profile_type: "seller",
          approval_status: "pending",
        } satisfies IShoppingMallCustomerProfile.IRequest,
      },
    );
  typia.assert(pendingSearch);
  // 3. Verify all returned profiles are pending sellers
  TestValidator.predicate(
    "all profiles are sellers",
    pendingSearch.data.every((profile) => profile.profile_type === "seller"),
  );
  TestValidator.predicate(
    "all profiles are pending",
    pendingSearch.data.every(
      (profile) => profile.approval_status === "pending",
    ),
  );
  // 4. Search for approved seller profiles
  const approvedSearch =
    await api.functional.shoppingMall.customer.profiles.index(
      customerConnection,
      {
        body: {
          profile_type: "seller",
          approval_status: "approved",
        } satisfies IShoppingMallCustomerProfile.IRequest,
      },
    );
  typia.assert(approvedSearch);
  // 5. Verify all returned profiles are approved sellers
  TestValidator.predicate(
    "all profiles are sellers",
    approvedSearch.data.every((profile) => profile.profile_type === "seller"),
  );
  TestValidator.predicate(
    "all profiles are approved",
    approvedSearch.data.every(
      (profile) => profile.approval_status === "approved",
    ),
  );
  // 6. Search for rejected seller profiles
  const rejectedSearch =
    await api.functional.shoppingMall.customer.profiles.index(
      customerConnection,
      {
        body: {
          profile_type: "seller",
          approval_status: "rejected",
        } satisfies IShoppingMallCustomerProfile.IRequest,
      },
    );
  typia.assert(rejectedSearch);
  // 7. Verify all returned profiles are rejected sellers
  TestValidator.predicate(
    "all profiles are sellers",
    rejectedSearch.data.every((profile) => profile.profile_type === "seller"),
  );
  TestValidator.predicate(
    "all profiles are rejected",
    rejectedSearch.data.every(
      (profile) => profile.approval_status === "rejected",
    ),
  );
  // 8. Search with approval_status without profile_type filter
  const pendingWithoutTypeFilter =
    await api.functional.shoppingMall.customer.profiles.index(
      customerConnection,
      {
        body: {
          approval_status: "pending",
        } satisfies IShoppingMallCustomerProfile.IRequest,
      },
    );
  typia.assert(pendingWithoutTypeFilter);
  // 9. Verify only seller profiles are returned (approval_status applies only to sellers)
  TestValidator.predicate(
    "all profiles are sellers when approval_status is used",
    pendingWithoutTypeFilter.data.every(
      (profile) => profile.profile_type === "seller",
    ),
  );
  TestValidator.predicate(
    "all profiles are pending",
    pendingWithoutTypeFilter.data.every(
      (profile) => profile.approval_status === "pending",
    ),
  );
  // 10. Validate pagination metadata
  TestValidator.predicate(
    "pending search pagination is valid",
    pendingSearch.pagination.current >= 1 &&
      pendingSearch.pagination.limit >= 1 &&
      pendingSearch.pagination.records >= 0 &&
      pendingSearch.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "approved search pagination is valid",
    approvedSearch.pagination.current >= 1 &&
      approvedSearch.pagination.limit >= 1 &&
      approvedSearch.pagination.records >= 0 &&
      approvedSearch.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "rejected search pagination is valid",
    rejectedSearch.pagination.current >= 1 &&
      rejectedSearch.pagination.limit >= 1 &&
      rejectedSearch.pagination.records >= 0 &&
      rejectedSearch.pagination.pages >= 0,
  );
}
