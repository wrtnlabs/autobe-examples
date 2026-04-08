import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * This test validates critical data isolation - sellers must NOT be able to see order items belonging to other sellers.
 *
 * **Test Steps:**
 * 1. Create seller A using `authorize_seller_join` utility
 * 2. Create seller B using `authorize_seller_join` utility
 * 3. Authenticate as seller A using the returned token
 * 4. Call PATCH /ecommerceMall/seller/order-items as seller A
 * 5. Verify seller A can only see their own order items (or empty list in simulation)
 * 6. Authenticate as seller B using the returned token
 * 7. Call PATCH /ecommerceMall/seller/order-items as seller B
 * 8. Verify seller B's order items are isolated from seller A's
 *
 * **Validation Points:**
 * - Response status should be 200 OK
 * - The data array should contain only order items belonging to the authenticated seller
 * - No cross-contamination between seller data should occur
 *
 * **Business Rules Verified:**
 * - Sellers are scoped to only see their own order items (data isolation)
 * - The system enforces seller_id filter automatically when seller role is authenticated
 * - A seller cannot access another seller's order information
 *
 * **Security Implications:**
 * - This prevents sellers from viewing competitor sales data
 * - This ensures order information confidentiality between sellers
 */
export async function test_api_seller_order_item_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller A using utility function
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerA);
  // 2. Create seller B using utility function
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerB);
  // Verify seller IDs are different
  TestValidator.notEquals("sellers have different IDs", sellerA.id, sellerB.id);
  // 3 & 4. As seller A, call PATCH /ecommerceMall/seller/order-items
  const orderItemsA =
    await api.functional.ecommerceMall.seller.order_items.index(
      sellerAConnection,
      {
        body: typia.random<IEcommerceMallOrderItem.IRequest>(),
      },
    );
  typia.assert(orderItemsA);
  // 5. Verify seller A's order items - check data isolation
  // All items should belong to seller A (have seller.id matching sellerA.id)
  for (const item of orderItemsA.data) {
    TestValidator.equals(
      "order item seller ID matches seller A",
      item.seller.id,
      sellerA.id,
    );
  }
  // 6 & 7. As seller B, call PATCH /ecommerceMall/seller/order-items
  const orderItemsB =
    await api.functional.ecommerceMall.seller.order_items.index(
      sellerBConnection,
      {
        body: typia.random<IEcommerceMallOrderItem.IRequest>(),
      },
    );
  typia.assert(orderItemsB);
  // 8. Verify seller B's order items - check data isolation
  // All items should belong to seller B (have seller.id matching sellerB.id)
  for (const item of orderItemsB.data) {
    TestValidator.equals(
      "order item seller ID matches seller B",
      item.seller.id,
      sellerB.id,
    );
  }
  // Cross-validation: ensure seller A cannot see seller B's data
  // Since the API is scoped, any items returned for A should not have seller B's ID
  const hasSellerBInAData = orderItemsA.data.some(
    (item) => item.seller.id === sellerB.id,
  );
  TestValidator.predicate(
    "seller A data does not contain seller B order items",
    !hasSellerBInAData,
  );
  // Cross-validation: ensure seller B cannot see seller A's data
  const hasSellerAInBData = orderItemsB.data.some(
    (item) => item.seller.id === sellerA.id,
  );
  TestValidator.predicate(
    "seller B data does not contain seller A order items",
    !hasSellerAInBData,
  );
}
