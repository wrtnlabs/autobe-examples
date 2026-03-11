import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShoppingCart";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_customer_carts_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_carts_items_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test customer retrieval of order item details from their order.
 * 1. Seller joins and creates a product with variants
 * 2. Customer joins and creates a cart
 * 3. Customer adds variant to cart
 * 4. Simulate order creation from cart checkout (order endpoint not available in SDK)
 * 5. Customer retrieves the order item
 * 6. Validate all response fields and snapshots
 */
export async function test_api_order_item_retrieval_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller Setup - Join and create product with variants
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: typia.random<IEcommerceMallSeller.IJoin>(),
  });
  typia.assert(seller);
  // Create a product for the seller
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        base_price: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<1000> &
            tags.Maximum<100000>
        >() satisfies number as number &
          tags.Type<"uint32"> &
          tags.Minimum<1000> &
          tags.Maximum<100000>,
        category_id: typia.random<
          string & tags.Format<"uuid">
        >() satisfies string as string & tags.Format<"uuid">,
        is_active: true,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 2. Customer Setup - Join and create cart
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: typia.random<IEcommerceMallCustomer.IJoin>(),
  });
  typia.assert(customer);
  // Create shopping cart
  const cart =
    await api.functional.ecommerceMall.customer.carts.create(
      customerConnection,
    );
  typia.assert(cart);
  // 3. Add product variant to cart
  // Use first variant from product
  const variant = product.variants[0];
  typia.assert(variant);
  const cartItem =
    await api.functional.ecommerceMall.customer.carts.items.create(
      customerConnection,
      {
        cartId: cart.id,
        body: {
          variant_id: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >() satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<5>,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // 4. Simulate order creation from cart checkout
  // Note: Order creation endpoint is not available in SDK, so we simulate the data
  const orderNumber = `ORD-${Date.now()}-${RandomGenerator.alphaNumeric(4)}`;
  const total_price = cartItem.price * cartItem.quantity;
  // Create simulated order item IDs and data
  const simulatedOrderId = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string as string & tags.Format<"uuid">;
  const simulatedItemId = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string as string & tags.Format<"uuid">;
  // Build order item with all expected fields
  const expectedOrderItem: IEcommerceMallOrderItem = {
    id: simulatedItemId,
    item_status: "paid",
    quantity: cartItem.quantity,
    unit_price: cartItem.price,
    product_snapshot: JSON.stringify({
      name: product.name,
      basePrice: product.base_price,
      category: product.category,
    }),
    variant_snapshot: JSON.stringify({
      skuCode: variant.sku_code,
      optionValues: variant.option_values,
      priceOverride: variant.price_override,
    }),
    seller_profile_snapshot: JSON.stringify({
      shopName: RandomGenerator.name(),
      email: seller.email,
    }),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    order: {
      id: simulatedOrderId,
      order_number: orderNumber,
      total_price,
      overall_status: "paid" as const,
      created_at: new Date().toISOString(),
      customer: {
        id: customer.id,
        email: customer.email,
        display_name: customer.email,
        is_banned: false,
        created_at: new Date().toISOString(),
      },
    },
    product: {
      id: product.id,
      name: product.name,
      basePrice: product.base_price,
      category: product.category,
      isActive: product.is_active,
      seller: {
        id: seller.id,
        email: seller.email,
        approvalStatus: seller.approval_status,
        rejectionReason: seller.rejection_reason ?? null,
        isSuspended: seller.is_suspended,
        isBanned: seller.is_banned,
        createdAt: seller.created_at,
        updatedAt: seller.updated_at,
      } satisfies IEcommerceMallSeller.ISummary,
    },
    variant: {
      id: variant.id,
      skuCode: variant.sku_code,
      optionValues: JSON.stringify(variant.option_values),
      priceOverride: variant.price_override ?? 0,
      stockQuantity: variant.stock_quantity,
      isActive: variant.is_active,
      product: {
        id: variant.product.id,
        name: variant.product.name,
        basePrice: variant.product.basePrice,
        category: variant.product.category,
        isActive: variant.product.isActive,
        seller: {
          id: seller.id,
          email: seller.email,
          approvalStatus: seller.approval_status,
          rejectionReason: seller.rejection_reason ?? null,
          isSuspended: seller.is_suspended,
          isBanned: seller.is_banned,
          createdAt: seller.created_at,
          updatedAt: seller.updated_at,
        } satisfies IEcommerceMallSeller.ISummary,
      } satisfies IEcommerceMallProduct.ISummary,
    },
  };
  // 5. Retrieve order item from customer
  const retrievedOrderItem =
    await api.functional.ecommerceMall.customer.orders.items.at(
      customerConnection,
      {
        orderId: simulatedOrderId,
        itemId: simulatedItemId,
      },
    );
  typia.assert(retrievedOrderItem);
  // 6. Validate response fields
  TestValidator.equals(
    "order item id matches",
    retrievedOrderItem.id,
    simulatedItemId,
  );
  TestValidator.equals("item status", retrievedOrderItem.item_status, "paid");
  TestValidator.equals(
    "quantity matches cart",
    retrievedOrderItem.quantity,
    cartItem.quantity,
  );
  TestValidator.equals(
    "unit price matches",
    retrievedOrderItem.unit_price,
    cartItem.price,
  );
  TestValidator.equals(
    "order id matches",
    retrievedOrderItem.order.id,
    simulatedOrderId,
  );
  TestValidator.equals(
    "order number matches",
    retrievedOrderItem.order.order_number,
    orderNumber,
  );
  TestValidator.equals(
    "total price matches",
    retrievedOrderItem.order.total_price,
    total_price,
  );
  // Validate snapshots are valid JSON and contain expected data
  const productSnapshot = JSON.parse(retrievedOrderItem.product_snapshot);
  TestValidator.equals(
    "product name in snapshot",
    productSnapshot.name,
    product.name,
  );
  TestValidator.equals(
    "product base price in snapshot",
    productSnapshot.basePrice,
    product.base_price,
  );
  TestValidator.predicate(
    "product category exists",
    productSnapshot.category !== null,
  );
  const variantSnapshot = JSON.parse(retrievedOrderItem.variant_snapshot);
  TestValidator.equals(
    "variant SKU in snapshot",
    variantSnapshot.skuCode,
    variant.sku_code,
  );
  TestValidator.notEquals(
    "variant options exist",
    variantSnapshot.optionValues,
    null,
  );
  const sellerSnapshot = JSON.parse(retrievedOrderItem.seller_profile_snapshot);
  TestValidator.notEquals("seller snapshot has data", sellerSnapshot, null);
  TestValidator.predicate(
    "seller has shop name",
    sellerSnapshot.shopName !== null,
  );
  // Validate order ownership - customer should only access their own orders
  TestValidator.equals(
    "order belongs to retrieving customer",
    retrievedOrderItem.order.customer.id,
    customer.id,
  );
  // Validate timestamps
  TestValidator.predicate(
    "order item has valid created_at timestamp",
    new Date(retrievedOrderItem.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "order item has valid updated_at timestamp",
    new Date(retrievedOrderItem.updated_at).getTime() > 0,
  );
  // Validate deleted_at is null for active order item
  TestValidator.equals(
    "order item not deleted",
    retrievedOrderItem.deleted_at,
    null,
  );
  // Validate variant data exists
  TestValidator.notEquals("variant exists", retrievedOrderItem.variant, null);
  TestValidator.equals(
    "variant SKU matches",
    retrievedOrderItem.variant.skuCode,
    variant.sku_code,
  );
}
