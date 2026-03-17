import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerApproval";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_seller_approval_list_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Register first seller (creates a pending SellerApproval record automatically)
  const sellerConnection1: api.IConnection = { host: connection.host };
  const seller1 = await authorize_seller_join(sellerConnection1, {});
  typia.assert(seller1);
  // 3. Register second seller (creates another pending SellerApproval record)
  const sellerConnection2: api.IConnection = { host: connection.host };
  const seller2 = await authorize_seller_join(sellerConnection2, {});
  typia.assert(seller2);
  // 4. Call PATCH /shoppingMall/superAdmin/sellerApprovals with no filters
  const page =
    await api.functional.shoppingMall.superAdmin.sellerApprovals.index(
      superAdminConnection,
      {
        body: {} satisfies IShoppingMallSellerApproval.IRequest,
      },
    );
  typia.assert(page);
  // 5. Validate pagination metadata
  TestValidator.predicate(
    "pagination current >= 1",
    page.pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit >= 1", page.pagination.limit >= 1);
  TestValidator.predicate(
    "pagination records >= 2",
    page.pagination.records >= 2,
  );
  TestValidator.predicate("pagination pages >= 1", page.pagination.pages >= 1);
  // 6. Validate data array has at least 2 items
  TestValidator.predicate("data has at least 2 items", page.data.length >= 2);
  // 7. Find the two registered sellers' approval records in the result
  const seller1Record = page.data.find((item) => item.seller.id === seller1.id);
  const seller2Record = page.data.find((item) => item.seller.id === seller2.id);
  TestValidator.predicate(
    "seller1 approval record exists in list",
    seller1Record !== undefined,
  );
  TestValidator.predicate(
    "seller2 approval record exists in list",
    seller2Record !== undefined,
  );
  // 8. Validate seller1 approval record structure
  if (seller1Record !== undefined) {
    TestValidator.equals(
      "seller1 approval status is pending",
      seller1Record.status,
      "pending",
    );
    TestValidator.equals(
      "seller1 email matches",
      seller1Record.seller.email,
      seller1.email,
    );
    TestValidator.equals(
      "seller1 shopName matches",
      seller1Record.seller.shopName,
      seller1.shopName,
    );
    TestValidator.equals(
      "seller1 reviewedAt is null for pending",
      seller1Record.reviewedAt,
      null,
    );
    TestValidator.equals(
      "seller1 rejectionReason is null for pending",
      seller1Record.rejectionReason,
      null,
    );
  }
  // 9. Validate seller2 approval record structure
  if (seller2Record !== undefined) {
    TestValidator.equals(
      "seller2 approval status is pending",
      seller2Record.status,
      "pending",
    );
    TestValidator.equals(
      "seller2 email matches",
      seller2Record.seller.email,
      seller2.email,
    );
    TestValidator.equals(
      "seller2 shopName matches",
      seller2Record.seller.shopName,
      seller2.shopName,
    );
    TestValidator.equals(
      "seller2 reviewedAt is null for pending",
      seller2Record.reviewedAt,
      null,
    );
    TestValidator.equals(
      "seller2 rejectionReason is null for pending",
      seller2Record.rejectionReason,
      null,
    );
  }
  // 10. Verify results are sorted by submission date descending (seller2 registered after seller1, so should appear first)
  const seller1Index = page.data.findIndex(
    (item) => item.seller.id === seller1.id,
  );
  const seller2Index = page.data.findIndex(
    (item) => item.seller.id === seller2.id,
  );
  if (seller1Index !== -1 && seller2Index !== -1) {
    TestValidator.predicate(
      "seller2 appears before seller1 (most recent first)",
      seller2Index < seller1Index,
    );
  }
}
