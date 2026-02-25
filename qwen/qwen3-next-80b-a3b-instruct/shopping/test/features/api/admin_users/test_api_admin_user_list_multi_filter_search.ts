import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_user_list_multi_filter_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authorize admin access
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Manually insert a matching test user via direct storage (since admin can't create users)
  // Since we have no API to create customers/sellers, we assume administrator has pre-existing users
  // We will simulate a single user with matching criteria
  const existingUser = {
    id: typia.random<string & tags.Format<"uuid">>(),
    display_name: "john doe" + RandomGenerator.alphabets(3),
    shop_name: undefined,
    status: "suspended" as const,
    email: "john.smith@test.com",
    phone_number: undefined,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: undefined,
  } satisfies IShoppingMallCategory;
  // Since we cannot create users via admin API, skip creation phase
  // Real system would have seeding via DB migrations or admin console
  // 3. Query users with multi-filter search: status=suspended, user_type=customer, search='john'
  const searchParams: IShoppingMallUser.IRequest = {
    status: "suspended" as const,
    user_type: "customer" as const,
    search: "john",
    page: 1,
    limit: 10,
  };
  const result = await api.functional.shoppingMall.admin.users.index(
    adminConnection,
    {
      body: searchParams,
    },
  );
  typia.assert(result);
  // 4. Validate results: checks for pagination accuracy
  TestValidator.equals(
    "page matches",
    result.pagination.current,
    searchParams.page ?? 1,
  );
  TestValidator.equals(
    "limit matches",
    result.pagination.limit,
    searchParams.limit ?? 20,
  );
  // 5. Validate that all returned users match filter criteria:
  // - status is suspended
  // - search matches email, display_name, or shop_name (case-insensitive)
  // - user_type filter is server-side only, not in response
  for (const user of result.data) {
    // Check status
    if (user.status !== "suspended") {
      throw new Error("All returned users must be suspended");
    }
    // Check search criteria: email, display_name, or shop_name contains 'john' (case-insensitive)
    const matchesEmail = user.email?.toLowerCase().includes("john") ?? false;
    const matchesDisplayName = user.display_name
      ?.toLowerCase()
      .includes("john") ?? false;
    const matchesShopName = user.shop_name?.toLowerCase().includes("john") ?? false;
    TestValidator.predicate(
      "user matches search 'john'",
      () => matchesEmail || matchesDisplayName || matchesShopName,
    );
  }
  // 6. Validate sorting by created_at descending - sort by created_at and compare
  const sortedResult = [...result.data].sort((a, b) => {
    const aDate = new Date(a.created_at).getTime();
    const bDate = new Date(b.created_at).getTime();
    return bDate - aDate; // descending
  });
  TestValidator.index(
    "users sorted by created_at descending",
    sortedResult,
    result.data,
  );
  // 7. Verify that at least one result was found
  // Real system would have data, but we assume test has data
  TestValidator.predicate(
    "at least one user matches filters",
    () => result.pagination.records > 0,
  );
}