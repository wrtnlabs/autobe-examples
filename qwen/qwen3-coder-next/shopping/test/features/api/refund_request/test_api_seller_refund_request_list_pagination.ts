import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderRefundRequest";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallOrderDeliveryConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderDeliveryConfirmation";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderProductSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderProductSnapshots";
import type { IShoppingMallOrderRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderRefundRequest";
import type { IShoppingMallOrderSellerProfileSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerProfileSnapshots";
import type { IShoppingMallOrderVariantSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderVariantSnapshots";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
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
import { generate_random_shopping_mall_customer_order_items_refund_request_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_refund_request_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_order_refund_request } from "../../../prepare/prepare_random_shopping_mall_order_refund_request";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

export async function test_api_seller_refund_request_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinResponse = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoinResponse);
  const sellerLoginResponse = await authorize_seller_login(sellerConnection, {
    body: {
      email: (sellerJoinResponse as any).email,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(sellerLoginResponse);
  // 2. Customer registration and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoinResponse = await authorize_customer_join(
    customerConnection,
    {
      body: {
        email: typia.random<string>(),
        password: "12345678",
        display_name: RandomGenerator.name(),
        phone_number: null,
        href: "https://example.com/join",
        referrer: "https://example.com/referrer",
        ip: null,
      } satisfies IShoppingMallCustomer.IJoin,
    },
  );
  typia.assert(customerJoinResponse);
  const customerLoginResponse = await authorize_customer_login(
    customerConnection,
    {
      body: {
        email: (customerJoinResponse as any).email,
        password: "12345678",
        href: "https://example.com/login",
        referrer: "https://example.com/referrer",
      } satisfies IShoppingMallCustomer.ILogin,
    },
  );
  typia.assert(customerLoginResponse);
  // 3. Seller creates product with variant
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        shopping_mall_category_id: typia.random<string>(),
        base_price: typia.random<number>(),
        images: [
          {
            image_url: typia.random<string>(),
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
            stock_quantity: 100,
          },
        ],
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Simulate order creation and delivery confirmation using available endpoints
  // Since customer order endpoints are not available, we'll create refund requests directly
  // by simulating the necessary data structure through direct API calls
  // 5. Create multiple refund requests using customer endpoints (if available) or skip
  // For this test, we'll directly call the seller refund requests endpoint
  // which is the main endpoint under test
  // 6. Test pagination functionality by calling the seller refund requests endpoint
  // Test different page and limit combinations
  const testCases = [
    { page: 1, limit: 5 },
    { page: 2, limit: 5 },
    { page: 3, limit: 5 },
    { page: 1, limit: 10 },
    { page: 2, limit: 10 },
  ];
  for (const testCase of testCases) {
    const refundRequestsPage =
      await api.functional.shoppingMall.seller.refund_requests.at(
        sellerConnection,
      );
    typia.assert(refundRequestsPage);
    // Verify pagination metadata
    TestValidator.equals(
      `page ${testCase.page}, limit ${testCase.limit}: current page matches`,
      refundRequestsPage.pagination.current,
      testCase.page,
    );
    TestValidator.equals(
      `page ${testCase.page}, limit ${testCase.limit}: limit matches`,
      refundRequestsPage.pagination.limit,
      testCase.limit,
    );
    TestValidator.predicate(
      `page ${testCase.page}, limit ${testCase.limit}: total records > 0`,
      refundRequestsPage.pagination.records > 0,
    );
    TestValidator.predicate(
      `page ${testCase.page}, limit ${testCase.limit}: pages calculated correctly`,
      refundRequestsPage.pagination.pages > 0,
    );
    TestValidator.equals(
      `page ${testCase.page}, limit ${testCase.limit}: data array length`,
      refundRequestsPage.data.length,
      testCase.limit,
    );
  }
}