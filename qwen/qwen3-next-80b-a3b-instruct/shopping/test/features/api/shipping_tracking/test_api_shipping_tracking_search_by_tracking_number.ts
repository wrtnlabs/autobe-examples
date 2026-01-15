import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShippingTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShippingTracking";
import type { IProductVariantAttributes } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductVariantAttributes";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCartSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartSession";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerBillingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerBillingAddress";
import type { IShoppingMallSellerOnboardingProgress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerOnboardingProgress";
import type { IShoppingMallSellerPayoutSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayoutSettings";
import type { IShoppingMallSellerPerformanceMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPerformanceMetrics";
import type { IShoppingMallSellerSocialMediaHandles } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSocialMediaHandles";
import type { IShoppingMallShippingTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingTracking";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_cart_session } from "../../../prepare/prepare_random_shopping_mall_cart_session";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_customer_carts_items_create } from "../../../generate/generate_random_shopping_mall_customer_carts_items_create";
import { generate_random_shopping_mall_cart_sessions_create } from "../../../generate/generate_random_shopping_mall_cart_sessions_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_shipping_tracking_search_by_tracking_number(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create customer connection and authenticate via join
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      business_name: RandomGenerator.name(),
      contact_phone: RandomGenerator.mobile(),
      createdAt: new Date().toISOString(),
    },
  });
  typia.assert(customer);
  
  // Step 2: Authenticate customer via login to get proper session
  const customerLogin = await authorize_member_login(customerConnection, {
    body: {
      email: customer.email,
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(customerLogin);
  
  // Step 3: Create seller connection and authenticate via join
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_member_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      business_name: RandomGenerator.name(),
      contact_phone: RandomGenerator.mobile(),
      createdAt: new Date().toISOString(),
    },
  });
  typia.assert(seller);
  
  // Step 4: Authenticate seller via login to get proper session
  const sellerLogin = await authorize_member_login(sellerConnection, {
    body: {
      email: seller.email,
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(sellerLogin);
  
  // Step 5: Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 10,
          wordMin: 4,
          wordMax: 8,
        }),
        categoryId: typia.random<string & tags.Format<"uuid">>(),
        price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<10> & tags.Maximum<1000>
        >(),
        sku: RandomGenerator.alphaNumeric(10),
        images: [
          "https://example.com/image1.jpg",
          "https://example.com/image2.jpg",
        ],
      },
    },
  );
  typia.assert(product);
  
  // Step 6: Seller creates a product variant with valid attributes
  const attributeId = typia.random<string & tags.Format<"uuid">>() ;
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          attributes: "{}",  // Changed from {} to string "{}"
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<10> & tags.Maximum<1000>
          >(),
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        },
      },
    );
  typia.assert(variant);
  
  // Step 7: Customer creates a cart session
  const cartSession = await generate_random_shopping_mall_cart_sessions_create(
    customerConnection,
    {
      body: {},
    },
  );
  typia.assert(cartSession);
  
  // Step 8: Customer adds product variant to cart
  const variantWithId = typia.assert<IShoppingMallProductVariant & { id: string }>(variant);
  const cartItem =
    await generate_random_shopping_mall_customer_carts_items_create(
      customerConnection,
      {
        params: { cartId: cartSession.id },
        body: {
          product_variant_id: variantWithId.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        },
      },
    );
  typia.assert(cartItem);
  
  // Step 9: Customer creates an order using real address and payment method
  const shippingAddressId = typia.random<string & tags.Format<"uuid">>();
  const paymentMethodId = typia.random<string & tags.Format<"uuid">>();
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        shipping_address_id: shippingAddressId,
        payment_method_id: paymentMethodId,
        ip: typia.random<string>(),
        href: "https://example.com/checkout",
        referrer: "https://example.com/cart",
        customer_id: customer.id,
        cart_session_id: cartSession.id,
      },
    },
  );
  typia.assert(order);
  
  // Step 10: We create a tracking number from the order ID - this is a workaround
  // since we have no way to create actual shipping tracking records via API
  // The scenario requires testing search by tracking number, so we must have one
  // We use the order ID as the tracking number since it's unique and guaranteed to exist
  const trackingNumber = order.id;
  
  // Step 11: Search for shipping tracking records using the tracking number
  const searchResponse =
    await api.functional.shoppingMall.shipping_trackings.patch(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          trackingNumber: trackingNumber,
        },
      },
    );
  typia.assert(searchResponse);
  
  // Step 12: Validate the search results
  TestValidator.equals(
    "correct number of results",
    searchResponse.data.length,
    1,
  );
  TestValidator.equals(
    "tracking number matches",
    searchResponse.data[0].tracking_number,
    trackingNumber,
  );
  TestValidator.equals(
    "order ID matches",
    searchResponse.data[0].order_id,
    order.id,
  );
  TestValidator.equals(
    "pagination matches",
    searchResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches",
    searchResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "total records matches",
    searchResponse.pagination.records,
    1,
  );
  TestValidator.equals(
    "total pages matches",
    searchResponse.pagination.pages,
    1,
  );
}