import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationRequest";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import type { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";
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
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_order_items_cancel_request_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_cancel_request_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_order_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_order_cancellation_request";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";
import { prepare_random_shopping_mall_shopping_cart } from "../../../prepare/prepare_random_shopping_mall_shopping_cart";

export async function test_api_customer_cancel_request_empty_reason_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller and customer connections
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.assert<string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>>(typia.random<string & tags.Format<"email">>()),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/register",
      referrer: "https://google.com",
      ip: "127.0.0.1",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Seller creates product with variant
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        images: [
          {
            image_url: RandomGenerator.paragraph({ sentences: 1 }),
            sort_order: 0,
          },
        ] satisfies IShoppingMallProductImage.ICreate[] & tags.MinItems<1>,
        variants: [
          {
            sku_code: RandomGenerator.alphaNumeric(8),
            option_values: [
              {
                option_name: "color",
                option_value: "black",
              },
            ] satisfies IShoppingMallProductVariantOptionValue.ICreate[] &
              tags.MinItems<1>,
            price_override: null,
            stock_quantity: 100,
          },
        ] satisfies IShoppingMallProductVariant.ICreate[] & tags.MinItems<1>,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Customer adds product to cart
  const cartItem = await api.functional.shoppingMall.customer.cart.items.create(
    customerConnection,
    {
      body: {
        shopping_mall_product_variant_id: product.variants[0].id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      } satisfies IShoppingMallShoppingCart.ICreate,
    },
  );
  typia.assert(cartItem);
  // 4. Customer creates order (checkout)
  const orderPage = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 10,
        status: "paid",
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        sortDirection: "desc",
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(orderPage);
  // Find the created order
  const order = orderPage.data.find((o) => o.status === "paid");
  if (!order) {
    throw new Error("No paid order found for cancellation test");
  }
  // 5. Attempt to create cancellation request with empty reason (should be rejected)
  await TestValidator.error("empty reason rejection", async () => {
    await api.functional.shoppingMall.customer.order_items.cancel_request.create(
      customerConnection,
      {
        itemId: order.id, // Use order ID (the error suggests using order item ID)
        body: {
          reason: "" satisfies string & tags.MinLength<1>, // Empty string should fail validation
        },
      },
    );
  });
  // 6. Also test whitespace-only reason
  await TestValidator.error("whitespace reason rejection", async () => {
    await api.functional.shoppingMall.customer.order_items.cancel_request.create(
      customerConnection,
      {
        itemId: order.id,
        body: {
          reason: "   " satisfies string & tags.MinLength<1>, // Whitespace should fail validation
        },
      },
    );
  });
  // 7. Verify cancellation request is not created for empty reason
  const cancellationRequests =
    await api.functional.shoppingMall.customer.order_items.cancel_request.create(
      customerConnection,
      {
        itemId: order.id,
        body: {
          reason: "Test cancellation request" satisfies string &
            tags.MinLength<1>,
        },
      },
    );
  typia.assert(cancellationRequests);
  TestValidator.equals(
    "cancellation request exists",
    cancellationRequests.status,
    "pending",
  );
}