import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test the filtering capabilities of the pending sellers list endpoint by email address.
 *
 * Validates the email search functionality for pending seller accounts. Creates multiple seller accounts with different email addresses and tests various search scenarios including single match, multiple matches, no matches, and case-insensitive matching. Verifies that the search performs partial matching on the email field and returns accurate pagination metadata.
 *
 * Special attention is given to ensuring that only pending sellers are returned, that the search is case-insensitive, and that the response includes complete seller profile information.
 *
 * 1. Administrator registers and authenticates to access the pending sellers endpoint.
 * 2. Multiple seller accounts are created with distinct email addresses for testing various search scenarios.
 * 3. Search by email fragment matching exactly one seller validates single result filtering.
 * 4. Search by email fragment matching multiple sellers validates multi-result filtering.
 * 5. Search by email fragment matching no sellers validates empty result handling.
 * 6. Case-insensitive search validates that uppercase/lowercase variations return the same results.
 * 7. Pagination parameters are tested to ensure proper pagination of filtered results.
 */
export async function test_api_seller_pending_list_filter_by_email(
  connection: api.IConnection,
) {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "Admin123",
    },
  });
  // 2. Create multiple pending sellers with different email addresses
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1 = await authorize_seller_join(seller1Connection, {
    body: {
      email: "john.doe@example.com",
      password: "Seller123",
    },
  });
  typia.assert(seller1);
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2 = await authorize_seller_join(seller2Connection, {
    body: {
      email: "jane.smith@example.com",
      password: "Seller123",
    },
  });
  typia.assert(seller2);
  const seller3Connection: api.IConnection = { host: connection.host };
  const seller3 = await authorize_seller_join(seller3Connection, {
    body: {
      email: "bob.wilson@test.com",
      password: "Seller123",
    },
  });
  typia.assert(seller3);
  const seller4Connection: api.IConnection = { host: connection.host };
  const seller4 = await authorize_seller_join(seller4Connection, {
    body: {
      email: "alice.john@shop.com",
      password: "Seller123",
    },
  });
  typia.assert(seller4);
  // 3. Test search by email fragment matching exactly one seller
  const singleMatch =
    await api.functional.shoppingMall.administrator.sellers.pending.index(
      adminConnection,
      {
        body: {
          search: "jane.smith",
          limit: 20,
        },
      },
    );
  typia.assert(singleMatch);
  TestValidator.equals("single match count", singleMatch.data.length, 1);
  TestValidator.equals(
    "single match email",
    singleMatch.data[0].email,
    "jane.smith@example.com",
  );
  TestValidator.equals(
    "single match pagination records",
    singleMatch.pagination.records,
    1,
  );
  // 4. Test search by email fragment matching multiple sellers
  const multiMatch =
    await api.functional.shoppingMall.administrator.sellers.pending.index(
      adminConnection,
      {
        body: {
          search: "john",
          limit: 20,
        },
      },
    );
  typia.assert(multiMatch);
  TestValidator.equals("multiple match count", multiMatch.data.length, 2);
  const multiMatchEmails = multiMatch.data.map((s) => s.email);
  TestValidator.predicate(
    "contains john.doe",
    multiMatchEmails.includes("john.doe@example.com"),
  );
  TestValidator.predicate(
    "contains alice.john",
    multiMatchEmails.includes("alice.john@shop.com"),
  );
  TestValidator.equals(
    "multiple match pagination records",
    multiMatch.pagination.records,
    2,
  );
  // 5. Test search by email fragment matching no sellers
  const noMatch =
    await api.functional.shoppingMall.administrator.sellers.pending.index(
      adminConnection,
      {
        body: {
          search: "nonexistent",
          limit: 20,
        },
      },
    );
  typia.assert(noMatch);
  TestValidator.equals("no match count", noMatch.data.length, 0);
  TestValidator.equals(
    "no match pagination records",
    noMatch.pagination.records,
    0,
  );
  // 6. Test case-insensitive search
  const caseInsensitive =
    await api.functional.shoppingMall.administrator.sellers.pending.index(
      adminConnection,
      {
        body: {
          search: "BOB.WILSON",
          limit: 20,
        },
      },
    );
  typia.assert(caseInsensitive);
  TestValidator.equals(
    "case insensitive match count",
    caseInsensitive.data.length,
    1,
  );
  TestValidator.equals(
    "case insensitive match email",
    caseInsensitive.data[0].email,
    "bob.wilson@test.com",
  );
  // 7. Test pagination with filtered results
  const paginated =
    await api.functional.shoppingMall.administrator.sellers.pending.index(
      adminConnection,
      {
        body: {
          search: "@example.com",
          limit: 1,
          page: 1,
        },
      },
    );
  typia.assert(paginated);
  TestValidator.equals("paginated page 1 count", paginated.data.length, 1);
  TestValidator.equals(
    "paginated page 1 current",
    paginated.pagination.current,
    1,
  );
  TestValidator.equals("paginated page 1 limit", paginated.pagination.limit, 1);
  TestValidator.equals(
    "paginated page 1 records",
    paginated.pagination.records,
    2,
  );
  TestValidator.equals("paginated page 1 pages", paginated.pagination.pages, 2);
  const paginatedPage2 =
    await api.functional.shoppingMall.administrator.sellers.pending.index(
      adminConnection,
      {
        body: {
          search: "@example.com",
          limit: 1,
          page: 2,
        },
      },
    );
  typia.assert(paginatedPage2);
  TestValidator.equals("paginated page 2 count", paginatedPage2.data.length, 1);
  TestValidator.equals(
    "paginated page 2 current",
    paginatedPage2.pagination.current,
    2,
  );
  TestValidator.equals(
    "paginated page 2 records",
    paginatedPage2.pagination.records,
    2,
  );
  TestValidator.equals(
    "paginated page 2 pages",
    paginatedPage2.pagination.pages,
    2,
  );
  // 8. Verify all sellers are in pending status
  const allPending =
    await api.functional.shoppingMall.administrator.sellers.pending.index(
      adminConnection,
      {
        body: {
          limit: 100,
        },
      },
    );
  typia.assert(allPending);
  TestValidator.equals("all pending count", allPending.data.length, 4);
  for (const seller of allPending.data) {
    TestValidator.predicate(
      `seller ${seller.email} is pending`,
      seller.approval_status === "pending",
    );
  }
}
