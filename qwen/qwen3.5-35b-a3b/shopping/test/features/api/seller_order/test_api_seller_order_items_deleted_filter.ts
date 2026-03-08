import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShoppingCart";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCartItem";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_carts_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_carts_cart_items_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";

export async function test_api_seller_order_items_deleted_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup Seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerResult = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerResult);
  // 2. Setup Customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 3. Query order items with include_deleted=false (default)
  const orderItemsNotDeleted =
    await api.functional.ecommerceMall.seller.orderItems.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          include_deleted: false,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(orderItemsNotDeleted);
  // 4. Query order items with include_deleted=true
  const orderItemsDeleted =
    await api.functional.ecommerceMall.seller.orderItems.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          include_deleted: true,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(orderItemsDeleted);
  // 5. Validate that include_deleted parameter works correctly
  // When include_deleted=false, only non-deleted items should be returned
  const nonDeletedItems = orderItemsNotDeleted.data;
  const allItems = orderItemsDeleted.data;
  // Filter based on order's deleted_at (not item's)
  const deletedItems = allItems.filter(
    (item) => item.order.deleted_at !== null,
  );
  const activeItems = allItems.filter((item) => item.order.deleted_at === null);
  TestValidator.equals(
    "non-deleted items count matches",
    nonDeletedItems.length,
    activeItems.length,
  );
  // When include_deleted=true, should include both active and deleted items
  TestValidator.equals(
    "all items count includes deleted",
    allItems.length,
    nonDeletedItems.length + deletedItems.length,
  );
  // 6. Validate that deleted items have deleted_at timestamp set on order
  for (const deletedItem of deletedItems) {
    TestValidator.notEquals(
      "deleted item order has deleted_at",
      deletedItem.order.deleted_at,
      null,
    );
    // Validate that deleted items still have immutable snapshots
    TestValidator.notEquals(
      "deleted item has productSnapshot",
      deletedItem.productSnapshot,
      "",
    );
    TestValidator.notEquals(
      "deleted item has variantSnapshot",
      deletedItem.variantSnapshot,
      "",
    );
    TestValidator.notEquals(
      "deleted item has sellerProfileSnapshot",
      deletedItem.sellerProfileSnapshot,
      "",
    );
    // Validate order reference is preserved
    TestValidator.equals(
      "deleted item has order",
      deletedItem.order !== null,
      true,
    );
  }
  // 7. Validate that active items have null deleted_at on order
  for (const activeItem of activeItems) {
    TestValidator.equals(
      "active item order has null deleted_at",
      activeItem.order.deleted_at,
      null,
    );
  }
}
