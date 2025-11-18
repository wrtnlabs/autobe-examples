import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

export async function test_api_admin_seller_deletion_happy_path(
  connection: api.IConnection,
) {
  // 1. Establish an authenticated admin context via POST /auth/admin/join
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // ip is optional and nullable; for happy path we can omit to let server derive
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Ensure at least one seller exists using PATCH /shoppingMall/admin/sellers
  const searchRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
  } satisfies IShoppingMallSeller.IRequest;

  const firstPage: IPageIShoppingMallSeller.ISummary =
    await api.functional.shoppingMall.admin.sellers.index(connection, {
      body: searchRequest,
    });
  typia.assert(firstPage);

  // Business assertion: there should be at least one seller present for this test to proceed
  TestValidator.predicate(
    "admin seller index should contain at least one seller to delete",
    firstPage.data.length > 0,
  );

  const targetSummary: IShoppingMallSeller.ISummary = firstPage.data[0];

  // 3. Optionally load full seller detail before deletion for stronger validation
  const beforeDetail: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.at(connection, {
      sellerId: targetSummary.id,
    });
  typia.assert(beforeDetail);

  TestValidator.equals(
    "detail seller id must match summary id before deletion",
    beforeDetail.id,
    targetSummary.id,
  );

  // 4. Delete the seller via DELETE /shoppingMall/admin/sellers/{sellerId}
  const deleted: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.erase(connection, {
      sellerId: targetSummary.id,
    });
  typia.assert(deleted);

  // Confirm the returned deleted seller id equals the target sellerId
  TestValidator.equals(
    "deleted seller id must equal target seller id",
    deleted.id,
    targetSummary.id,
  );

  // Optionally check some lifecycle hints if deleted_at is present
  TestValidator.equals(
    "deleted seller id must equal pre-deletion detail id",
    deleted.id,
    beforeDetail.id,
  );

  // 5. After deletion, GET /shoppingMall/admin/sellers/{sellerId} should fail.
  await TestValidator.error(
    "getting a deleted seller by id should result in an error",
    async () => {
      await api.functional.shoppingMall.admin.sellers.at(connection, {
        sellerId: targetSummary.id,
      });
    },
  );

  // 6. Optionally verify seller no longer appears in admin seller index results
  const afterPage: IPageIShoppingMallSeller.ISummary =
    await api.functional.shoppingMall.admin.sellers.index(connection, {
      body: searchRequest,
    });
  typia.assert(afterPage);

  const stillExists = afterPage.data.some(
    (item) => item.id === targetSummary.id,
  );

  TestValidator.predicate(
    "deleted seller should not appear in subsequent admin sellers index page",
    !stillExists,
  );
}
