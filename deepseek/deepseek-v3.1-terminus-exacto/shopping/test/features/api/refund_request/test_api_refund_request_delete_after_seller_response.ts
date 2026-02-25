import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceDeliveryConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDeliveryConfirmation";
import type { IEcommerceInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceInventoryRecord";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceOrderSnapshotCategoryPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotCategoryPerformance";
import type { IEcommerceOrderSnapshotGeographicDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistribution";
import type { IEcommerceOrderSnapshotGeographicDistributionCity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionCity";
import type { IEcommerceOrderSnapshotGeographicDistributionCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionCountry";
import type { IEcommerceOrderSnapshotGeographicDistributionRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionRegion";
import type { IEcommerceOrderSnapshotGeographicDistributionTopRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionTopRegion";
import type { IEcommerceOrderSnapshotGeographicDistributionUnknown } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionUnknown";
import type { IEcommerceOrderSnapshotHourlyDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotHourlyDistribution";
import type { IEcommerceOrderSnapshotSellerPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotSellerPerformance";
import type { IEcommerceOrderSnapshotStatusDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotStatusDistribution";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import type { IEcommerceRefundResponseRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundResponseRecord";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
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
import { generate_random_ecommerce_customer_carts_items_create } from "../../../generate/generate_random_ecommerce_customer_carts_items_create";
import { generate_random_ecommerce_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_customer_refund_requests_create";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { generate_random_ecommerce_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_seller_products_variants_create";
import { prepare_random_ecommerce_cart_item } from "../../../prepare/prepare_random_ecommerce_cart_item";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";
import { prepare_random_ecommerce_refund_request } from "../../../prepare/prepare_random_ecommerce_refund_request";

export async function test_api_refund_request_delete_after_seller_response(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller and product setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 4 }),
        base_price: typia.random<number & tags.Minimum<1000>>(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku: RandomGenerator.alphabets(10),
          option_values: JSON.stringify({ color: "red", size: "M" }),
          price_override: null,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
        } satisfies IEcommerceProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 2. Create customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 3. Create a refund request
  const refundRequest =
    await generate_random_ecommerce_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IEcommerceRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // 4. Seller responds to the refund request
  const sellerResponse =
    await api.functional.ecommerce.seller.refund_requests.responses.create(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          id: refundRequest.id,
          reason: refundRequest.reason,
          requested_at: refundRequest.requested_at,
          refund_window_expires_at: refundRequest.refund_window_expires_at,
          customer: {
            id: customer.id,
            email: customer.email,
            display_name: customer.display_name,
            created_at: customer.created_at,
          } satisfies IEcommerceCustomer.ISummary,
          seller: {
            id: seller.id,
            email: seller.email,
            shop_name: seller.shop_name,
            shop_description: seller.shop_description,
            logo_image_url: seller.logo_image_url,
            account_status: seller.account_status,
            created_at: seller.created_at,
          } satisfies IEcommerceSeller.ISummary,
          order_item: {
            id: typia.random<string & tags.Format<"uuid">>(),
            quantity: typia.random<number & tags.Type<"int32">>(),
            unit_price: typia.random<number>(),
            total_price: typia.random<number>(),
            status: "delivered",
            seller: {
              id: seller.id,
              email: seller.email,
              shop_name: seller.shop_name,
              shop_description: seller.shop_description,
              logo_image_url: seller.logo_image_url,
              account_status: seller.account_status,
              created_at: seller.created_at,
            } satisfies IEcommerceSeller.ISummary,
            productVariant: {
              id: variant.id,
              sku: variant.sku,
              option_values: variant.option_values,
              price_override: variant.price_override,
              quantity: variant.quantity,
              product: {
                id: product.id,
                name: product.name,
                base_price: product.base_price,
                seller: {
                  id: seller.id,
                  email: seller.email,
                  shop_name: seller.shop_name,
                  shop_description: seller.shop_description,
                  logo_image_url: seller.logo_image_url,
                  account_status: seller.account_status,
                  created_at: seller.created_at,
                } satisfies IEcommerceSeller.ISummary,
                category: {
                  id: typia.random<string & tags.Format<"uuid">>(),
                  name: RandomGenerator.name(),
                  parent: null,
                  products_count: typia.random<
                    number & tags.Type<"int32"> & tags.Minimum<0>
                  >(),
                  created_at: new Date().toISOString(),
                },
              } satisfies IEcommerceProduct.ISummary,
            } satisfies IEcommerceProductVariant.ISummary,
          } satisfies IEcommerceOrderItem.ISummary,
          created_at: refundRequest.created_at,
          updated_at: refundRequest.updated_at,
        } satisfies IEcommerceRefundRequest.IResponse,
      },
    );
  typia.assert(sellerResponse);
  // 5. Attempt deletion by customer - should fail due to business rule
  await TestValidator.error(
    "refund request deletion should fail after seller response",
    async () => {
      await api.functional.ecommerce.customer.refund_requests.erase(
        customerConnection,
        { refundRequestId: refundRequest.id },
      );
    },
  );
}
