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
 * Test profile search functionality with various filter criteria for shopping mall platform.
 *
 * Validates the complete profile search workflow including customer authentication, profile filtering by type, status, and date ranges, search functionality, and pagination. Ensures that the search endpoint correctly filters and returns customer and seller profiles based on specified criteria.
 *
 * Special attention is given to verifying that the profile_type discriminator correctly distinguishes between customer and seller profiles, and that filter combinations work as expected.
 *
 * 1. Customer registers and authenticates to access the profile search endpoint.
 * 2. Search profiles with no filters to retrieve all available profiles.
 * 3. Filter by profile_type='customer' to verify only customer profiles are returned.
 * 4. Filter by profile_type='seller' to verify only seller profiles are returned.
 * 5. Search by partial email to verify search functionality works correctly.
 * 6. Filter by approval_status='pending' to verify seller approval status filtering.
 * 7. Filter by is_suspended=true to verify suspension status filtering.
 * 8. Filter by is_banned=true to verify ban status filtering.
 * 9. Filter by date range (created_after, created_before) to verify temporal filtering.
 * 10. Test pagination with page=2 and limit=10 to verify pagination works correctly.
 */
export async function test_api_profile_search_with_filters(
  connection: api.IConnection,
) {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {},
  });
  typia.assert(customerAuth);
  // 2. Search with no filters - should return all profiles
  const allProfiles = await api.functional.shoppingMall.customer.profiles.index(
    customerConnection,
    {
      body: {} satisfies IShoppingMallCustomerProfile.IRequest,
    },
  );
  typia.assert(allProfiles);
  TestValidator.predicate(
    "no filters returns profiles",
    allProfiles.pagination.records > 0,
  );
  TestValidator.equals(
    "pagination current is 1",
    allProfiles.pagination.current,
    1,
  );
  // 3. Filter by profile_type='customer'
  const customerProfiles =
    await api.functional.shoppingMall.customer.profiles.index(
      customerConnection,
      {
        body: {
          profile_type: "customer",
        } satisfies IShoppingMallCustomerProfile.IRequest,
      },
    );
  typia.assert(customerProfiles);
  TestValidator.predicate(
    "customer filter returns only customer profiles",
    customerProfiles.data.every(
      (profile) => profile.profile_type === "customer",
    ),
  );
  if (customerProfiles.data.length > 0) {
    const firstCustomer = customerProfiles.data[0];
    TestValidator.predicate(
      "customer profile has display_name",
      firstCustomer.display_name !== undefined,
    );
  }
  // 4. Filter by profile_type='seller'
  const sellerProfiles =
    await api.functional.shoppingMall.customer.profiles.index(
      customerConnection,
      {
        body: {
          profile_type: "seller",
        } satisfies IShoppingMallCustomerProfile.IRequest,
      },
    );
  typia.assert(sellerProfiles);
  TestValidator.predicate(
    "seller filter returns only seller profiles",
    sellerProfiles.data.every((profile) => profile.profile_type === "seller"),
  );
  if (sellerProfiles.data.length > 0) {
    const firstSeller = sellerProfiles.data[0];
    TestValidator.predicate(
      "seller profile has shop_name",
      firstSeller.shop_name !== undefined,
    );
    TestValidator.predicate(
      "seller profile has approval_status",
      firstSeller.approval_status !== undefined,
    );
  }
  // 5. Search by partial email using the registered customer's email
  const searchQuery = customerAuth.email.split("@")[0];
  const searchedProfiles =
    await api.functional.shoppingMall.customer.profiles.index(
      customerConnection,
      {
        body: {
          search: searchQuery,
        } satisfies IShoppingMallCustomerProfile.IRequest,
      },
    );
  typia.assert(searchedProfiles);
  TestValidator.predicate(
    "search returns matching profiles",
    searchedProfiles.data.length > 0,
  );
  TestValidator.predicate(
    "search results contain the queried email",
    searchedProfiles.data.some((profile) =>
      profile.email.toLowerCase().includes(searchQuery.toLowerCase()),
    ),
  );
  // 6. Filter by approval_status='pending'
  const pendingProfiles =
    await api.functional.shoppingMall.customer.profiles.index(
      customerConnection,
      {
        body: {
          profile_type: "seller",
          approval_status: "pending",
        } satisfies IShoppingMallCustomerProfile.IRequest,
      },
    );
  typia.assert(pendingProfiles);
  TestValidator.predicate(
    "approval_status filter returns only pending sellers",
    pendingProfiles.data.every(
      (profile) => profile.approval_status === "pending",
    ),
  );
  // 7. Filter by is_suspended=true
  const suspendedProfiles =
    await api.functional.shoppingMall.customer.profiles.index(
      customerConnection,
      {
        body: {
          is_suspended: true,
        } satisfies IShoppingMallCustomerProfile.IRequest,
      },
    );
  typia.assert(suspendedProfiles);
  TestValidator.predicate(
    "is_suspended filter returns only suspended profiles",
    suspendedProfiles.data.every((profile) => profile.is_suspended === true),
  );
  // 8. Filter by is_banned=true
  const bannedProfiles =
    await api.functional.shoppingMall.customer.profiles.index(
      customerConnection,
      {
        body: {
          is_banned: true,
        } satisfies IShoppingMallCustomerProfile.IRequest,
      },
    );
  typia.assert(bannedProfiles);
  TestValidator.predicate(
    "is_banned filter returns only banned profiles",
    bannedProfiles.data.every((profile) => profile.is_banned === true),
  );
  // 9. Filter by date range
  const now = new Date();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateRangeProfiles =
    await api.functional.shoppingMall.customer.profiles.index(
      customerConnection,
      {
        body: {
          created_after: oneMonthAgo.toISOString(),
          created_before: now.toISOString(),
        } satisfies IShoppingMallCustomerProfile.IRequest,
      },
    );
  typia.assert(dateRangeProfiles);
  TestValidator.predicate(
    "date range filter returns profiles within range",
    dateRangeProfiles.data.every(
      (profile) =>
        new Date(profile.created_at) >= oneMonthAgo &&
        new Date(profile.created_at) < now,
    ),
  );
  // 10. Test pagination
  const paginatedProfiles =
    await api.functional.shoppingMall.customer.profiles.index(
      customerConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IShoppingMallCustomerProfile.IRequest,
      },
    );
  typia.assert(paginatedProfiles);
  TestValidator.equals(
    "pagination current is 2",
    paginatedProfiles.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit is 10",
    paginatedProfiles.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination returns correct limit",
    paginatedProfiles.data.length <= 10,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    paginatedProfiles.pagination.pages ===
      Math.ceil(paginatedProfiles.pagination.records / 10),
  );
}
