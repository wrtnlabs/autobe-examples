import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IPageIShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerApproval";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_list_filtered_by_status_and_shop_name(
  connection: api.IConnection,
): Promise<void> {
  // -----------------------------------------------------------------------
  // 1. Setup: Admin registration
  // -----------------------------------------------------------------------
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // -----------------------------------------------------------------------
  // 2. Setup: Register Seller A with distinctive shop name
  // -----------------------------------------------------------------------
  const uniqueShopNameA = `UniqueShopAlpha-${RandomGenerator.alphaNumeric(8)}`;
  const sellerEmailA = typia.random<string & tags.Format<"email">>();
  const sellerPasswordA = RandomGenerator.alphaNumeric(16);
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAAuthorized = await authorize_seller_join(sellerAConnection, {
    body: {
      email: sellerEmailA,
      password: sellerPasswordA,
      shop_name: uniqueShopNameA,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAAuthorized);
  // -----------------------------------------------------------------------
  // 3. Setup: Register Seller B with different shop name
  // -----------------------------------------------------------------------
  const shopNameB = `BetaShop-${RandomGenerator.alphaNumeric(8)}`;
  const sellerEmailB = typia.random<string & tags.Format<"email">>();
  const sellerPasswordB = RandomGenerator.alphaNumeric(16);
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBAuthorized = await authorize_seller_join(sellerBConnection, {
    body: {
      email: sellerEmailB,
      password: sellerPasswordB,
      shop_name: shopNameB,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerBAuthorized);
  const sellerAId = sellerAAuthorized.id;
  // -----------------------------------------------------------------------
  // 4. Retrieve seller approval records to find Seller A's pending approval
  // -----------------------------------------------------------------------
  const approvalsPage =
    await api.functional.shoppingMall.admin.sellerApprovals.index(
      adminConnection,
      {
        body: {
          status: "pending",
          sellerEmail: sellerEmailA,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSellerApproval.IRequest,
      },
    );
  typia.assert(approvalsPage);
  // Find the approval record for Seller A
  const approvalA = approvalsPage.data.find(
    (a) => a.seller.email === sellerEmailA,
  );
  TestValidator.predicate(
    "Seller A approval record found",
    approvalA !== undefined,
  );
  // -----------------------------------------------------------------------
  // 5. Approve Seller A's registration
  // -----------------------------------------------------------------------
  const approvedRecord =
    await api.functional.shoppingMall.admin.sellerApprovals.update(
      adminConnection,
      {
        approvalId: approvalA!.id,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IShoppingMallSellerApproval.IUpdate,
      },
    );
  typia.assert(approvedRecord);
  // -----------------------------------------------------------------------
  // 6. Suspend Seller A
  // -----------------------------------------------------------------------
  const suspendedSeller =
    await api.functional.shoppingMall.admin.sellers.suspend(adminConnection, {
      sellerId: sellerAId,
    });
  typia.assert(suspendedSeller);
  TestValidator.equals(
    "Seller A is suspended",
    suspendedSeller.isSuspended,
    true,
  );
  // -----------------------------------------------------------------------
  // 7. Filter by isSuspended = true
  // -----------------------------------------------------------------------
  const suspendedPage = await api.functional.shoppingMall.admin.sellers.index(
    adminConnection,
    {
      body: {
        isSuspended: true,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(suspendedPage);
  // Seller A should appear
  const sellerAInSuspended = suspendedPage.data.find((s) => s.id === sellerAId);
  TestValidator.predicate(
    "Seller A appears in isSuspended=true filter",
    sellerAInSuspended !== undefined,
  );
  TestValidator.predicate(
    "Seller A isSuspended is true",
    sellerAInSuspended !== undefined && sellerAInSuspended.isSuspended === true,
  );
  // Seller B should NOT appear (not suspended)
  const sellerBInSuspended = suspendedPage.data.find(
    (s) => s.id === sellerBAuthorized.id,
  );
  TestValidator.predicate(
    "Seller B does NOT appear in isSuspended=true filter",
    sellerBInSuspended === undefined,
  );
  // -----------------------------------------------------------------------
  // 8. Filter by isSuspended = false
  // -----------------------------------------------------------------------
  const notSuspendedPage =
    await api.functional.shoppingMall.admin.sellers.index(adminConnection, {
      body: {
        isSuspended: false,
      } satisfies IShoppingMallSeller.IRequest,
    });
  typia.assert(notSuspendedPage);
  // Seller B should appear
  const sellerBInNotSuspended = notSuspendedPage.data.find(
    (s) => s.id === sellerBAuthorized.id,
  );
  TestValidator.predicate(
    "Seller B appears in isSuspended=false filter",
    sellerBInNotSuspended !== undefined,
  );
  TestValidator.predicate(
    "Seller B isSuspended is false",
    sellerBInNotSuspended !== undefined &&
      sellerBInNotSuspended.isSuspended === false,
  );
  // Seller A should NOT appear (it is suspended)
  const sellerAInNotSuspended = notSuspendedPage.data.find(
    (s) => s.id === sellerAId,
  );
  TestValidator.predicate(
    "Seller A does NOT appear in isSuspended=false filter",
    sellerAInNotSuspended === undefined,
  );
  // -----------------------------------------------------------------------
  // 9. Filter by partial shop name (UniqueShopAlpha)
  // -----------------------------------------------------------------------
  const shopNameFilterPage =
    await api.functional.shoppingMall.admin.sellers.index(adminConnection, {
      body: {
        shopName: "UniqueShopAlpha",
      } satisfies IShoppingMallSeller.IRequest,
    });
  typia.assert(shopNameFilterPage);
  // Only Seller A should be returned
  TestValidator.equals(
    "Shop name filter returns exactly 1 record",
    shopNameFilterPage.data.length,
    1,
  );
  TestValidator.predicate(
    "Returned seller has matching shop name",
    shopNameFilterPage.data[0]?.shopName.includes("UniqueShopAlpha") === true,
  );
  // -----------------------------------------------------------------------
  // 10. Filter with no matching results
  // -----------------------------------------------------------------------
  const noMatchPage = await api.functional.shoppingMall.admin.sellers.index(
    adminConnection,
    {
      body: {
        shopName: "NonExistentShop99999",
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(noMatchPage);
  TestValidator.equals(
    "No match filter: data is empty",
    noMatchPage.data.length,
    0,
  );
  TestValidator.equals(
    "No match filter: pagination.records is 0",
    noMatchPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "No match filter: pagination.pages is 0",
    noMatchPage.pagination.pages,
    0,
  );
}
