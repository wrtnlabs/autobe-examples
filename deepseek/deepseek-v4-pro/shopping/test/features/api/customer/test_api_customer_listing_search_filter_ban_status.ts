import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test customer listing search and filter capabilities for ban status auditing.
 *
 * Validates the administrative customer listing endpoint with comprehensive search and filter combinations. Ensures that administrators can locate specific customer accounts through partial email search and display name full-text search, audit account standing through ban status filtering, and narrow results by registration date range.
 *
 * The test also verifies that multiple filters combine correctly when applied together and that pagination continues to function properly with active filters.
 *
 * 1. Administrator authenticates via join to obtain access token.
 * 2. Retrieves all customers without any filters as baseline.
 * 3. Filters by ban_status "active" and validates all results have banned_at null.
 * 4. Filters by ban_status "banned" and validates all results have banned_at non-null.
 * 5. Searches by partial email substring from a sample customer and verifies the source customer appears in results.
 * 6. Searches by display name substring using full-text search.
 * 7. Filters by registration date range using created_to bound.
 * 8. Combines ban_status "active" and date range filters together.
 * 9. Tests pagination with active ban_status filter and validates pagination metadata including current page and data count.
 */
export async function test_api_customer_listing_search_filter_ban_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Get all customers without filters
  const allCustomers = await api.functional.shoppingMall.admin.customers.index(
    adminConnection,
    {
      body: {} satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(allCustomers);
  // 3. Filter by active ban_status
  const activeCustomers =
    await api.functional.shoppingMall.admin.customers.index(adminConnection, {
      body: {
        ban_status: "active",
      } satisfies IShoppingMallCustomer.IRequest,
    });
  typia.assert(activeCustomers);
  for (const customer of activeCustomers.data) {
    TestValidator.equals(
      "active customer has null banned_at",
      customer.banned_at,
      null,
    );
  }
  // 4. Filter by banned ban_status
  const bannedCustomers =
    await api.functional.shoppingMall.admin.customers.index(adminConnection, {
      body: {
        ban_status: "banned",
      } satisfies IShoppingMallCustomer.IRequest,
    });
  typia.assert(bannedCustomers);
  for (const customer of bannedCustomers.data) {
    TestValidator.predicate(
      "banned customer has non-null banned_at",
      customer.banned_at !== null,
    );
  }
  // 5. Search by partial email substring
  if (allCustomers.data.length > 0) {
    const sampleEmail = allCustomers.data[0].email;
    const emailSubstring = sampleEmail.substring(
      0,
      Math.min(5, sampleEmail.length),
    );
    const emailSearchResult =
      await api.functional.shoppingMall.admin.customers.index(adminConnection, {
        body: {
          search: emailSubstring,
        } satisfies IShoppingMallCustomer.IRequest,
      });
    typia.assert(emailSearchResult);
    TestValidator.predicate(
      "email search returns matching results",
      emailSearchResult.data.length > 0,
    );
    TestValidator.predicate(
      "source customer found in email search results",
      emailSearchResult.data.some((c) => c.id === allCustomers.data[0].id),
    );
  }
  // 6. Search by display name via full-text search
  if (allCustomers.data.length > 0) {
    const sampleDisplayName = allCustomers.data[0].display_name;
    const nameSubstring = RandomGenerator.substring(sampleDisplayName);
    const nameSearchResult =
      await api.functional.shoppingMall.admin.customers.index(adminConnection, {
        body: {
          search: nameSubstring,
        } satisfies IShoppingMallCustomer.IRequest,
      });
    typia.assert(nameSearchResult);
  }
  // 7. Filter by registration date range
  const now = new Date().toISOString();
  const dateFiltered = await api.functional.shoppingMall.admin.customers.index(
    adminConnection,
    {
      body: {
        created_to: now satisfies string as string & tags.Format<"date-time">,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(dateFiltered);
  // 8. Combined filter: ban_status active + date range
  const combined = await api.functional.shoppingMall.admin.customers.index(
    adminConnection,
    {
      body: {
        ban_status: "active",
        created_to: now satisfies string as string & tags.Format<"date-time">,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(combined);
  for (const customer of combined.data) {
    TestValidator.equals(
      "combined filter active customer has null banned_at",
      customer.banned_at,
      null,
    );
  }
  // 9. Pagination with active ban_status filter
  const paginated = await api.functional.shoppingMall.admin.customers.index(
    adminConnection,
    {
      body: {
        ban_status: "active",
        page: 1 satisfies number as number &
          tags.Type<"int32"> &
          tags.Minimum<1>,
        limit: 5 satisfies number as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(paginated);
  TestValidator.equals(
    "paginated current page is 1",
    paginated.pagination.current,
    1,
  );
  TestValidator.predicate(
    "paginated data count does not exceed limit",
    paginated.data.length <= 5,
  );
  TestValidator.predicate(
    "paginated has valid pages metadata",
    paginated.pagination.pages >= 0,
  );
}
