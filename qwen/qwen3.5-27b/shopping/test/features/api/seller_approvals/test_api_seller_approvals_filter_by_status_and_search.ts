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

/**
 * Test filtering seller approvals by approval status and searching by shop name or email.
 *
 * Validates the administrator seller approvals endpoint filtering and search functionality. Tests filtering by approval_status (approved, rejected, pending), searching by shop_name with case-insensitive partial matching, and searching by email with case-insensitive partial matching. Ensures that the filtering correctly narrows results based on the specified criteria.
 *
 * Special attention is given to verifying that the filtering correctly narrows results based on approval status, that shop name and email searches work with partial matching, and that pagination metadata accurately reflects the filtered result counts.
 *
 * 1. Authenticate as administrator using utility function.
 * 2. Query seller approvals with approval_status='approved' filter.
 * 3. Query seller approvals with approval_status='rejected' filter and verify rejection_reason.
 * 4. Query seller approvals with shop_name search parameter.
 * 5. Query seller approvals with email search parameter.
 * 6. Validate filtering accuracy and pagination metadata.
 */
export async function test_api_seller_approvals_filter_by_status_and_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "12345678",
      href: "https://test.com/admin/join",
      referrer: "https://test.com/admin",
    },
  });
  // 2. Test filtering by approval_status='approved'
  const approvedResult =
    await api.functional.shoppingMall.administrator.seller_approvals.index(
      adminConnection,
      {
        body: {
          approval_status: "approved",
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(approvedResult);
  // Verify all returned sellers have approved status
  await ArrayUtil.asyncForEach(approvedResult.data, async (seller) => {
    TestValidator.equals(
      "seller approval status is approved",
      seller.approval_status,
      "approved",
    );
    TestValidator.predicate(
      "rejection_reason is null for approved seller",
      seller.rejection_reason === null,
    );
  });
  // 3. Test filtering by approval_status='rejected'
  const rejectedResult =
    await api.functional.shoppingMall.administrator.seller_approvals.index(
      adminConnection,
      {
        body: {
          approval_status: "rejected",
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(rejectedResult);
  // Verify all rejected sellers have rejection_reason populated
  await ArrayUtil.asyncForEach(rejectedResult.data, async (seller) => {
    TestValidator.equals(
      "seller approval status is rejected",
      seller.approval_status,
      "rejected",
    );
    TestValidator.predicate(
      "rejection_reason is populated for rejected seller",
      seller.rejection_reason !== null,
    );
  });
  // 4. Test filtering by approval_status='pending'
  const pendingResult =
    await api.functional.shoppingMall.administrator.seller_approvals.index(
      adminConnection,
      {
        body: {
          approval_status: "pending",
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(pendingResult);
  // Verify all returned sellers have pending status
  await ArrayUtil.asyncForEach(pendingResult.data, async (seller) => {
    TestValidator.equals(
      "seller approval status is pending",
      seller.approval_status,
      "pending",
    );
    TestValidator.predicate(
      "rejection_reason is null for pending seller",
      seller.rejection_reason === null,
    );
  });
  // 5. Test searching by shop_name (case-insensitive partial match)
  const shopNameSearchResult =
    await api.functional.shoppingMall.administrator.seller_approvals.index(
      adminConnection,
      {
        body: {
          shop_name: "coffee",
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(shopNameSearchResult);
  // Verify all returned sellers have 'coffee' in shop name (case-insensitive)
  await ArrayUtil.asyncForEach(shopNameSearchResult.data, async (seller) => {
    TestValidator.predicate(
      `seller shop name contains 'coffee' (case-insensitive)`,
      seller.seller_profile.shop_name.toLowerCase().includes("coffee"),
    );
  });
  // 6. Test searching by email (case-insensitive partial match)
  const emailSearchResult =
    await api.functional.shoppingMall.administrator.seller_approvals.index(
      adminConnection,
      {
        body: {
          search: "test",
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(emailSearchResult);
  // Verify all returned sellers have 'test' in email (case-insensitive)
  await ArrayUtil.asyncForEach(emailSearchResult.data, async (seller) => {
    TestValidator.predicate(
      `seller email contains 'test' (case-insensitive)`,
      seller.email.toLowerCase().includes("test"),
    );
  });
  // 7. Test combined filtering: approval_status + shop_name
  const combinedFilterResult =
    await api.functional.shoppingMall.administrator.seller_approvals.index(
      adminConnection,
      {
        body: {
          approval_status: "approved",
          shop_name: "coffee",
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(combinedFilterResult);
  // Verify combined filter: approved status AND shop name contains 'coffee'
  await ArrayUtil.asyncForEach(combinedFilterResult.data, async (seller) => {
    TestValidator.equals(
      "seller approval status is approved",
      seller.approval_status,
      "approved",
    );
    TestValidator.predicate(
      `seller shop name contains 'coffee'`,
      seller.seller_profile.shop_name.toLowerCase().includes("coffee"),
    );
  });
  // 8. Verify pagination metadata for all results
  TestValidator.predicate(
    "approved pagination current page is valid",
    approvedResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "approved pagination limit is within bounds",
    approvedResult.pagination.limit >= 1 &&
      approvedResult.pagination.limit <= 100,
  );
  TestValidator.equals(
    "approved pagination records count matches data length",
    approvedResult.pagination.records,
    approvedResult.data.length,
  );
  TestValidator.predicate(
    "rejected pagination current page is valid",
    rejectedResult.pagination.current >= 1,
  );
  TestValidator.equals(
    "rejected pagination records count matches data length",
    rejectedResult.pagination.records,
    rejectedResult.data.length,
  );
  TestValidator.predicate(
    "pending pagination current page is valid",
    pendingResult.pagination.current >= 1,
  );
  TestValidator.equals(
    "pending pagination records count matches data length",
    pendingResult.pagination.records,
    pendingResult.data.length,
  );
  TestValidator.predicate(
    "shop name search pagination current page is valid",
    shopNameSearchResult.pagination.current >= 1,
  );
  TestValidator.equals(
    "shop name search pagination records count matches data length",
    shopNameSearchResult.pagination.records,
    shopNameSearchResult.data.length,
  );
  TestValidator.predicate(
    "email search pagination current page is valid",
    emailSearchResult.pagination.current >= 1,
  );
  TestValidator.equals(
    "email search pagination records count matches data length",
    emailSearchResult.pagination.records,
    emailSearchResult.data.length,
  );
  TestValidator.predicate(
    "combined filter pagination current page is valid",
    combinedFilterResult.pagination.current >= 1,
  );
  TestValidator.equals(
    "combined filter pagination records count matches data length",
    combinedFilterResult.pagination.records,
    combinedFilterResult.data.length,
  );
}
