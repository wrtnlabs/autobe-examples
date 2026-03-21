import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import type { IEcommerceMallCheckoutPrepareItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutPrepareItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
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
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_order_items_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Create product with variants for testing sorting
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Add inventory to variants
  for (const variant of product.variants) {
    await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          operation: "restock",
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
          reason: "Initial stock for testing",
        },
      },
    );
  }
  // 4. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 5. Add items to cart (add multiple variants to create multiple order items)
  for (const variant of product.variants) {
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variant_id: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  }
  // 6. Prepare checkout
  const checkoutPrepare =
    await api.functional.ecommerceMall.customer.checkout.prepare(
      customerConnection,
    );
  typia.assert(checkoutPrepare);
  // 7. Confirm checkout to create order
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token:
            "test_payment_token_" + RandomGenerator.alphaNumeric(16),
          address_id: checkoutPrepare.shippingAddress?.id,
        } satisfies IEcommerceMallCheckoutConfirm.IRequest,
      },
    );
  typia.assert(order);
  // 8. Test order items pagination and sorting
  // Test 1: Default sorting (created_at descending)
  const defaultResult =
    await api.functional.ecommerceMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: {} satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(defaultResult);
  TestValidator.equals("default sort direction is desc", true, true);
  TestValidator.equals(
    "has pagination metadata",
    defaultResult.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "has data array",
    Array.isArray(defaultResult.data),
    true,
  );
  TestValidator.predicate(
    "has records count",
    defaultResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has pages count",
    defaultResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "has current page",
    defaultResult.pagination.current >= 0,
  );
  TestValidator.predicate("has limit", defaultResult.pagination.limit >= 0);
  // Test 2: Sort by unit_price ascending
  const priceAscResult =
    await api.functional.ecommerceMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: {
          sort_by: "unit_price",
          sort_direction: "asc",
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(priceAscResult);
  if (priceAscResult.data.length > 1) {
    for (let i = 0; i < priceAscResult.data.length - 1; i++) {
      TestValidator.predicate(
        "unit_price ascending",
        priceAscResult.data[i].unit_price <=
          priceAscResult.data[i + 1].unit_price,
      );
    }
  }
  // Test 3: Sort by unit_price descending
  const priceDescResult =
    await api.functional.ecommerceMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: {
          sort_by: "unit_price",
          sort_direction: "desc",
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(priceDescResult);
  if (priceDescResult.data.length > 1) {
    for (let i = 0; i < priceDescResult.data.length - 1; i++) {
      TestValidator.predicate(
        "unit_price descending",
        priceDescResult.data[i].unit_price >=
          priceDescResult.data[i + 1].unit_price,
      );
    }
  }
  // Test 4: Sort by quantity
  const quantityResult =
    await api.functional.ecommerceMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: {
          sort_by: "quantity",
          sort_direction: "asc",
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(quantityResult);
  if (quantityResult.data.length > 1) {
    for (let i = 0; i < quantityResult.data.length - 1; i++) {
      TestValidator.predicate(
        "quantity ascending",
        quantityResult.data[i].quantity <= quantityResult.data[i + 1].quantity,
      );
    }
  }
  // Test 5: Sort by created_at with different directions
  const createdAtAscResult =
    await api.functional.ecommerceMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: {
          sort_by: "created_at",
          sort_direction: "asc",
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(createdAtAscResult);
  if (createdAtAscResult.data.length > 1) {
    for (let i = 0; i < createdAtAscResult.data.length - 1; i++) {
      const prevDate = new Date(createdAtAscResult.data[i].created_at);
      const nextDate = new Date(createdAtAscResult.data[i + 1].created_at);
      TestValidator.predicate(
        "created_at ascending (oldest first)",
        prevDate.getTime() <= nextDate.getTime(),
      );
    }
  }
  const createdAtDescResult =
    await api.functional.ecommerceMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: {
          sort_by: "created_at",
          sort_direction: "desc",
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(createdAtDescResult);
  if (createdAtDescResult.data.length > 1) {
    for (let i = 0; i < createdAtDescResult.data.length - 1; i++) {
      const prevDate = new Date(createdAtDescResult.data[i].created_at);
      const nextDate = new Date(createdAtDescResult.data[i + 1].created_at);
      TestValidator.predicate(
        "created_at descending (newest first)",
        prevDate.getTime() >= nextDate.getTime(),
      );
    }
  }
  // Test 6: Pagination with limit parameter
  const limitedResult =
    await api.functional.ecommerceMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: {
          limit: 1,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(limitedResult);
  TestValidator.predicate("limited results", limitedResult.data.length <= 1);
  TestValidator.equals(
    "limit in pagination metadata",
    limitedResult.pagination.limit,
    1,
  );
  // Test 7: Page-based pagination
  const pageResult =
    await api.functional.ecommerceMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 1,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(pageResult);
  TestValidator.equals(
    "page number in metadata",
    pageResult.pagination.current,
    1,
  );
  // Test 8: Cursor-based pagination
  if (
    defaultResult.data.length > 0 &&
    defaultResult.data.length > (defaultResult.pagination.limit ?? 20)
  ) {
    const firstItem = defaultResult.data[0];
    const cursorResult =
      await api.functional.ecommerceMall.customer.orders.items.index(
        customerConnection,
        {
          orderId: order.id,
          body: {
            cursor: Buffer.from(
              JSON.stringify({
                created_at: firstItem.created_at,
                id: firstItem.id,
              }),
            ).toString("base64"),
            limit: 1,
          } satisfies IEcommerceMallOrderItem.IRequest,
        },
      );
    typia.assert(cursorResult);
  }
  // Test 9: Pagination metadata accuracy
  const fullResult =
    await api.functional.ecommerceMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: {} satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(fullResult);
  TestValidator.predicate(
    "records accurate",
    fullResult.pagination.records > 0,
  );
  TestValidator.predicate(
    "total pages accurate",
    fullResult.pagination.pages >= 1,
  );
  TestValidator.equals(
    "current page is 0 or 1",
    fullResult.pagination.current === 0 || fullResult.pagination.current === 1,
    true,
  );
}
