import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
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

export async function test_api_seller_approvals_list_by_admin_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Register 3 sellers (each creates a SellerApproval with status 'pending')
  const sellerEmails: string[] = [];
  await ArrayUtil.asyncRepeat(3, async (i) => {
    const sellerConnection: api.IConnection = { host: connection.host };
    const sellerAuth = await authorize_seller_join(sellerConnection, {});
    typia.assert(sellerAuth);
    sellerEmails.push(sellerAuth.email);
  });
  // 3. Admin retrieves page 1 with limit=2
  const page1 = await api.functional.shoppingMall.admin.sellerApprovals.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 2,
      } satisfies IShoppingMallSellerApproval.IRequest,
    },
  );
  typia.assert(page1);
  // Validate pagination metadata for page 1
  TestValidator.predicate(
    "page1.pagination.records >= 3",
    page1.pagination.records >= 3,
  );
  TestValidator.equals("page1.pagination.current", page1.pagination.current, 1);
  TestValidator.equals("page1.pagination.limit", page1.pagination.limit, 2);
  TestValidator.equals(
    "page1.pagination.pages",
    page1.pagination.pages,
    Math.ceil(page1.pagination.records / 2),
  );
  TestValidator.predicate("page1.data.length <= 2", page1.data.length <= 2);
  TestValidator.predicate("page1.data.length >= 1", page1.data.length >= 1);
  // 4. Admin retrieves page 2 with limit=2
  const page2 = await api.functional.shoppingMall.admin.sellerApprovals.index(
    adminConnection,
    {
      body: {
        page: 2,
        limit: 2,
      } satisfies IShoppingMallSellerApproval.IRequest,
    },
  );
  typia.assert(page2);
  // Validate pagination metadata for page 2
  TestValidator.equals("page2.pagination.current", page2.pagination.current, 2);
  TestValidator.equals("page2.pagination.limit", page2.pagination.limit, 2);
  TestValidator.equals(
    "page2.pagination.records",
    page2.pagination.records,
    page1.pagination.records,
  );
  // 5. Ensure no duplicate IDs across page 1 and page 2
  const page1Ids = new Set(page1.data.map((item) => item.id));
  const page2Ids = page2.data.map((item) => item.id);
  for (const id of page2Ids) {
    TestValidator.predicate(
      "no duplicate approval IDs across pages",
      !page1Ids.has(id),
    );
  }
  // 6. Verify all 3 registered sellers are represented across both pages
  const allData = [...page1.data, ...page2.data];
  const foundSellerEmails = new Set(allData.map((item) => item.seller.email));
  for (const email of sellerEmails) {
    TestValidator.predicate(
      `seller ${email} found in paginated results`,
      foundSellerEmails.has(email),
    );
  }
  // 7. Verify each item's structure (pending items should have null reviewedAt and rejectionReason)
  for (const item of allData) {
    if (item.status === "pending") {
      TestValidator.equals(
        "pending item reviewedAt is null",
        item.reviewedAt,
        null,
      );
      TestValidator.equals(
        "pending item rejectionReason is null",
        item.rejectionReason,
        null,
      );
    }
  }
}
