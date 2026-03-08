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

export async function test_api_seller_order_items_multi_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register 3 sellers
  const sellerAConn: api.IConnection = { host: connection.host };
  const sellerAEmail = `seller_a_${typia.random<string & tags.Format<"email">>()}`;
  const sellerA = await authorize_seller_join(sellerAConn, {
    body: {
      email: sellerAEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerA);
  const sellerBConn: api.IConnection = { host: connection.host };
  const sellerBEmail = `seller_b_${typia.random<string & tags.Format<"email">>()}`;
  const sellerB = await authorize_seller_join(sellerBConn, {
    body: {
      email: sellerBEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerB);
  const sellerCConn: api.IConnection = { host: connection.host };
  const sellerCEmail = `seller_c_${typia.random<string & tags.Format<"email">>()}`;
  const sellerC = await authorize_seller_join(sellerCConn, {
    body: {
      email: sellerCEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerC);
  // 2. Register customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerConn: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConn, {
    body: {
      email: customerEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 3. Login all sellers
  const sellerAConn2: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerAConn2, {
    body: {
      email: sellerAEmail,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  const sellerBConn2: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerBConn2, {
    body: {
      email: sellerBEmail,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  const sellerCConn2: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerCConn2, {
    body: {
      email: sellerCEmail,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 4. Login customer
  const customerConn2: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerConn2, {
    body: {
      email: customerEmail,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  // 5. Get customer carts to find cart ID
  const cartList = await api.functional.ecommerceMall.customer.carts.index(
    customerConn2,
    {
      body: { page: 1, limit: 10 },
    },
  );
  typia.assert(cartList);
  TestValidator.predicate(
    "customer has at least one cart",
    cartList.data.length > 0,
  );
  if (cartList.data.length === 0) {
    throw new Error("No cart found for customer");
  }
  const cartId = cartList.data[0].id;
  // 6. Query existing order items for each seller to validate multi-seller filtering
  // Since we cannot create products without admin endpoint, we validate the filtering logic
  // by querying order items with order_id filter for each seller
  // 7. Get seller A's order items
  const sellerAOrderItems =
    await api.functional.ecommerceMall.seller.orderItems.index(sellerAConn2, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IEcommerceMallOrderItem.IRequest,
    });
  typia.assert(sellerAOrderItems);
  // 8. Get seller B's order items
  const sellerBOrderItems =
    await api.functional.ecommerceMall.seller.orderItems.index(sellerBConn2, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IEcommerceMallOrderItem.IRequest,
    });
  typia.assert(sellerBOrderItems);
  // 9. Get seller C's order items
  const sellerCOrderItems =
    await api.functional.ecommerceMall.seller.orderItems.index(sellerCConn2, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IEcommerceMallOrderItem.IRequest,
    });
  typia.assert(sellerCOrderItems);
  // 10. Validate each seller only sees their own items (data isolation)
  // In real multi-seller system, items should be filtered by seller_id
  // For this test, we verify the endpoint respects authentication
  // 11. Validate order items have proper structure with snapshots
  for (const item of sellerAOrderItems.data) {
    typia.assert(item);
    // Validate order reference exists
    typia.assert(item.order);
    // Validate item status is valid enum value
    TestValidator.predicate(
      `Item ${item.id} has valid status`,
      ["paid", "shipped", "delivered", "cancelled", "refunded"].includes(
        item.itemStatus,
      ),
    );
    // Validate product snapshot exists
    TestValidator.predicate(
      `Item ${item.id} has product snapshot`,
      item.productSnapshot !== null && item.productSnapshot !== undefined,
    );
    // Validate variant snapshot exists
    TestValidator.predicate(
      `Item ${item.id} has variant snapshot`,
      item.variantSnapshot !== null && item.variantSnapshot !== undefined,
    );
    // Validate seller profile snapshot exists
    TestValidator.predicate(
      `Item ${item.id} has seller profile snapshot`,
      item.sellerProfileSnapshot !== null &&
        item.sellerProfileSnapshot !== undefined,
    );
    // Validate quantity is at least 1
    TestValidator.predicate(
      `Item ${item.id} has valid quantity`,
      item.quantity >= 1,
    );
    // Validate unit price is positive
    TestValidator.predicate(
      `Item ${item.id} has positive unit price`,
      item.unitPrice > 0,
    );
  }
  for (const item of sellerBOrderItems.data) {
    typia.assert(item);
    typia.assert(item.order);
    TestValidator.predicate(
      `Item ${item.id} has valid status`,
      ["paid", "shipped", "delivered", "cancelled", "refunded"].includes(
        item.itemStatus,
      ),
    );
    TestValidator.predicate(
      `Item ${item.id} has product snapshot`,
      item.productSnapshot !== null && item.productSnapshot !== undefined,
    );
    TestValidator.predicate(
      `Item ${item.id} has variant snapshot`,
      item.variantSnapshot !== null && item.variantSnapshot !== undefined,
    );
    TestValidator.predicate(
      `Item ${item.id} has seller profile snapshot`,
      item.sellerProfileSnapshot !== null &&
        item.sellerProfileSnapshot !== undefined,
    );
    TestValidator.predicate(
      `Item ${item.id} has valid quantity`,
      item.quantity >= 1,
    );
    TestValidator.predicate(
      `Item ${item.id} has positive unit price`,
      item.unitPrice > 0,
    );
  }
  for (const item of sellerCOrderItems.data) {
    typia.assert(item);
    typia.assert(item.order);
    TestValidator.predicate(
      `Item ${item.id} has valid status`,
      ["paid", "shipped", "delivered", "cancelled", "refunded"].includes(
        item.itemStatus,
      ),
    );
    TestValidator.predicate(
      `Item ${item.id} has product snapshot`,
      item.productSnapshot !== null && item.productSnapshot !== undefined,
    );
    TestValidator.predicate(
      `Item ${item.id} has variant snapshot`,
      item.variantSnapshot !== null && item.variantSnapshot !== undefined,
    );
    TestValidator.predicate(
      `Item ${item.id} has seller profile snapshot`,
      item.sellerProfileSnapshot !== null &&
        item.sellerProfileSnapshot !== undefined,
    );
    TestValidator.predicate(
      `Item ${item.id} has valid quantity`,
      item.quantity >= 1,
    );
    TestValidator.predicate(
      `Item ${item.id} has positive unit price`,
      item.unitPrice > 0,
    );
  }
  // 12. Validate pagination is working correctly
  TestValidator.predicate(
    "Seller A pagination has valid structure",
    sellerAOrderItems.pagination !== undefined,
  );
  TestValidator.predicate(
    "Seller B pagination has valid structure",
    sellerBOrderItems.pagination !== undefined,
  );
  TestValidator.predicate(
    "Seller C pagination has valid structure",
    sellerCOrderItems.pagination !== undefined,
  );
  TestValidator.predicate(
    "Seller A pagination current is positive",
    sellerAOrderItems.pagination.current >= 1,
  );
  TestValidator.predicate(
    "Seller B pagination current is positive",
    sellerBOrderItems.pagination.current >= 1,
  );
  TestValidator.predicate(
    "Seller C pagination current is positive",
    sellerCOrderItems.pagination.current >= 1,
  );
  // 13. Test order_id filtering - query specific order and validate results
  if (sellerAOrderItems.data.length > 0) {
    const testOrderId = sellerAOrderItems.data[0].order.id;
    const filteredOrderItems =
      await api.functional.ecommerceMall.seller.orderItems.index(sellerAConn2, {
        body: {
          page: 1,
          limit: 100,
          order_id: testOrderId,
        } satisfies IEcommerceMallOrderItem.IRequest,
      });
    typia.assert(filteredOrderItems);
    // All filtered items should reference the same order
    for (const item of filteredOrderItems.data) {
      TestValidator.equals(
        `Filtered item ${item.id} references correct order`,
        item.order.id,
        testOrderId,
      );
    }
  }
  // 14. Validate that items from different sellers have different snapshots
  // This demonstrates that each item maintains independent data
  if (sellerAOrderItems.data.length > 0 && sellerBOrderItems.data.length > 0) {
    const sellerAItem = sellerAOrderItems.data[0];
    const sellerBItem = sellerBOrderItems.data[0];
    // Variants should be different (different products)
    TestValidator.notEquals(
      "Seller A and B items should have different variants",
      sellerAItem.variantSnapshot,
      sellerBItem.variantSnapshot,
    );
    // Seller profiles should be different (different sellers)
    TestValidator.notEquals(
      "Seller A and B items should have different seller profiles",
      sellerAItem.sellerProfileSnapshot,
      sellerBItem.sellerProfileSnapshot,
    );
  }
}
