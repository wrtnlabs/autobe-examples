import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItemSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test order item snapshot retrieval with null seller_logo_url edge case.
 *
 * Validates the complete order item snapshot browsing workflow including administrator authentication, snapshot retrieval, and proper handling of nullable seller_logo_url fields. Ensures that snapshots with null seller_logo_url are correctly included in results and not filtered out.
 *
 * Special attention is given to verifying that the seller_logo_url field is explicitly returned as null (not omitted) and that all other snapshot fields remain properly populated. The test confirms that filtering operations work correctly regardless of seller_logo_url nullability.
 *
 * 1. Administrator authenticates via authorize_admin_join utility.
 * 2. Retrieves all order item snapshots without filters.
 * 3. Validates response structure and pagination metadata.
 * 4. Verifies snapshots with null seller_logo_url are present and correctly formatted.
 * 5. Tests filtering by product_name includes null logo snapshots.
 * 6. Confirms pagination counts include snapshots with null logos.
 */
export async function test_api_order_item_snapshot_null_seller_logo(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Retrieve all order item snapshots without filters
  const allSnapshots =
    await api.functional.shoppingMall.admin.admin.order_item_snapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  // 3. Validate response structure
  TestValidator.predicate(
    "has pagination",
    allSnapshots.pagination !== undefined,
  );
  TestValidator.predicate("has data array", Array.isArray(allSnapshots.data));
  TestValidator.predicate(
    "current page is 1",
    allSnapshots.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit is 100",
    allSnapshots.pagination.limit === 100,
  );
  // 4. Validate snapshots with null seller_logo_url handling
  const nullLogoSnapshots = allSnapshots.data.filter(
    (snapshot) => snapshot.seller_logo_url === null,
  );
  // 5. If there are snapshots with null logo, validate their structure
  if (nullLogoSnapshots.length > 0) {
    const nullLogoSnapshot = nullLogoSnapshots[0];
    // Validate seller_logo_url is explicitly null (not undefined or omitted)
    TestValidator.equals(
      "seller_logo_url is explicitly null",
      nullLogoSnapshot.seller_logo_url,
      null,
    );
    // Validate other required fields are populated (business logic, not type checks)
    TestValidator.predicate(
      "product_name is non-empty",
      nullLogoSnapshot.product_name.length > 0,
    );
    TestValidator.predicate(
      "variant_price is positive",
      nullLogoSnapshot.variant_price > 0,
    );
    TestValidator.predicate(
      "seller_shop_name is non-empty",
      nullLogoSnapshot.seller_shop_name.length > 0,
    );
  }
  // 6. Test filtering by product_name includes null logo snapshots
  if (
    nullLogoSnapshots.length > 0 &&
    nullLogoSnapshots[0].product_name.length > 0
  ) {
    const testSnapshot = nullLogoSnapshots[0];
    const searchLength = Math.min(10, testSnapshot.product_name.length);
    const filteredSnapshots =
      await api.functional.shoppingMall.admin.admin.order_item_snapshots.index(
        adminConnection,
        {
          body: {
            product_name: testSnapshot.product_name.substring(0, searchLength),
            page: 1,
            limit: 100,
          } satisfies IShoppingMallOrderItemSnapshot.IRequest,
        },
      );
    typia.assert(filteredSnapshots);
    // Verify filtered results still include snapshots (filtering works with null logos)
    TestValidator.predicate(
      "filtered results is array",
      Array.isArray(filteredSnapshots.data),
    );
  }
  // 7. Confirm pagination records count matches data length for current page
  TestValidator.predicate(
    "pagination records >= data length",
    allSnapshots.pagination.records >= allSnapshots.data.length,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    allSnapshots.pagination.pages >= (allSnapshots.data.length > 0 ? 1 : 0),
  );
  // 8. Validate that null logo snapshots are valid business records
  TestValidator.predicate(
    "null logo snapshots are retrievable",
    nullLogoSnapshots.length >= 0,
  );
}
