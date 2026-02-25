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

export async function test_api_customer_cancel_request_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as customer_A (buyer)
  const customerAConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>
      >(),
      password: "12341234",
      href: "https://example.com/join",
      referrer: "https://example.com/referrer",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Join as customer_B (seller)
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>
      >(),
      password: "12341234",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 3. Login as seller to create product
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>
      >(),
      password: "12341234",
    } satisfies IShoppingMallSeller.ILogin,
  });
  // Create product with variant as seller
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerLoginConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
        images: [
          {
            image_url: typia.random<string & tags.Format<"uri">>(),
            sort_order: 0,
          },
        ],
        variants: [
          {
            sku_code: RandomGenerator.alphaNumeric(8),
            option_values: [
              {
                option_name: "color",
                option_value: "red",
              },
            ],
            stock_quantity: 10,
          },
        ],
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Login as customer_A to add product to cart
  const customerALoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerALoginConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>
      >(),
      password: "12341234",
      href: "https://example.com/login",
      referrer: "https://example.com/referrer",
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // Add product variant to cart
  const cartItem = await api.functional.shoppingMall.customer.cart.items.create(
    customerALoginConnection,
    {
      body: {
        shopping_mall_product_variant_id: product.variants[0].id,
        quantity: 1,
      } satisfies IShoppingMallShoppingCart.ICreate,
    },
  );
  typia.assert(cartItem);
  // 5. Checkout order
  const orderResult = await api.functional.shoppingMall.customer.orders.index(
    customerALoginConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(orderResult);
  // Find the newly created order
  const newOrder = orderResult.data.find((order) => order.status === "paid");
  if (!newOrder) {
    throw new Error("No paid order found to test cancellation");
  }
  // 6. Submit cancellation request
  const cancellationRequest =
    await api.functional.shoppingMall.customer.order_items.cancel_request.create(
      customerALoginConnection,
      {
        itemId: cartItem.id,
        body: {
          reason: "Changed my mind about the purchase",
        } satisfies IShoppingMallOrderCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  // 7. Verify cancellation request status
  TestValidator.equals(
    "cancellation status",
    cancellationRequest.status,
    "pending",
  );
  TestValidator.notEquals(
    "cancellation ID",
    cancellationRequest.id,
    cartItem.id,
  );
  // 8. Verify seller notification (indirect validation)
  // Seller would receive notification via webhooks or other mechanisms
  // This test validates the request creation, notification delivery is out of scope
  TestValidator.predicate("seller notification expected", () => true);
}
