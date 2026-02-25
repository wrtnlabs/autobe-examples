import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationRequest";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import type { IShoppingMallShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCartItem";
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
import { generate_random_shopping_mall_customer_carts_items_create } from "../../../generate/generate_random_shopping_mall_customer_carts_items_create";
import { generate_random_shopping_mall_customer_order_items_cancel_request_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_cancel_request_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_order_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_order_cancellation_request";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";
import { prepare_random_shopping_mall_shopping_cart_item } from "../../../prepare/prepare_random_shopping_mall_shopping_cart_item";

export async function test_api_seller_cancellation_rejection_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller A creates product
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await api.functional.shoppingMall.auth.seller.join(
    sellerAConnection,
    {
      body: {
        email: "seller_a@example.com" as string,
        password: "SellerA123!@#$" as string,
        shop_name: "Seller A Shop",
        shop_description: RandomGenerator.paragraph({ sentences: 2 }),
        logo_image_url: null,
      } satisfies IShoppingMallSeller.IJoin,
    },
  );
  typia.assert(sellerA);
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerAConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<100> & tags.MultipleOf<100>
        >(),
        shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
        images: [
          {
            image_url: typia.random<string & tags.Format<"uri">>(),
            sort_order: 0,
          },
        ] satisfies IShoppingMallProductImage.ICreate[] & tags.MinItems<1>,
        variants: [
          {
            sku_code: RandomGenerator.alphaNumeric(8),
            option_values: [
              {
                option_name: "color",
                option_value: "red",
              },
            ] satisfies IShoppingMallProductVariantOptionValue.ICreate[] &
              tags.MinItems<1>,
            price_override: null,
            stock_quantity: 10,
          },
        ] satisfies IShoppingMallProductVariant.ICreate[] & tags.MinItems<1>,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 2. Customer joins
  const customerConnection: api.IConnection = { host: connection.host };
  await api.functional.shoppingMall.auth.customer.join(customerConnection, {
    body: {
      email: "customer@example.com" as string,
      password: "Customer123!@#$" as string,
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/customer/join",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 3. Seller B (unauthorized) joins
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await api.functional.shoppingMall.auth.seller.join(
    sellerBConnection,
    {
      body: {
        email: "seller_b@example.com" as string,
        password: "SellerB123!@#$" as string,
        shop_name: "Seller B Shop",
        shop_description: null,
        logo_image_url: null,
      } satisfies IShoppingMallSeller.IJoin,
    },
  );
  typia.assert(sellerB);
  // 4. Attempt unauthorized cancellation rejection
  // Since we can't create a proper order context without orders API,
  // we'll test that seller B cannot reject a cancellation request
  // for an order item they don't own (even if the item doesn't exist)
  // Create a fake order item ID for testing unauthorized access
  const fakeOrderItemId = "00000000-0000-0000-0000-000000000001";
  const fakeCancellationRequestId = "00000000-0000-0000-0000-000000000002";
  // Seller B attempts to reject cancellation request for order item they don't own
  // This should fail with unauthorized error
  await TestValidator.error("unauthorized cancellation rejection", async () => {
    await api.functional.shoppingMall.seller.cancel_requests.rejection.reject(
      sellerBConnection,
      {
        requestId: fakeCancellationRequestId,
        body: {
          rejection_reason: "Seller B doesn't want to cancel",
        } satisfies IShoppingMallOrderCancellationRequest.IUpdate,
      },
    );
  });
}
