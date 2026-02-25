import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import type { IEcommerceCancellationResponseRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationResponseRecord";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceInventoryRecord";
import type { IEcommerceModificationInventoryRestoration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceModificationInventoryRestoration";
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
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
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
import { generate_random_ecommerce_customer_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_customer_cancellation_requests_create";
import { generate_random_ecommerce_seller_cancellation_requests_responses_create } from "../../../generate/generate_random_ecommerce_seller_cancellation_requests_responses_create";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { generate_random_ecommerce_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_seller_products_variants_create";
import { prepare_random_ecommerce_cancellation_request } from "../../../prepare/prepare_random_ecommerce_cancellation_request";
import { prepare_random_ecommerce_cancellation_response_record } from "../../../prepare/prepare_random_ecommerce_cancellation_response_record";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";

export async function test_api_inventory_restoration_retrieval_cancellation_triggered(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: null,
      href: "https://example.com",
      referrer: "https://example.com",
      ip: null,
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Create product
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 2,
          wordMax: 4,
        }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // Create variant with inventory
  const quantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<10>
  >();
  const variant =
    await generate_random_ecommerce_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku: RandomGenerator.alphabets(8).toUpperCase(),
          option_values: JSON.stringify({ color: "red", size: "M" }),
          price_override: null,
          quantity: quantity,
        } satisfies IEcommerceProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // Authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // Create order (simulate payment success)
  const order = await api.functional.ecommerce.customer.orders.create(
    customerConnection,
    {
      body: typia.random<IEcommerceOrder>(),
    },
  );
  typia.assert(order);
  // Submit cancellation request
  const cancellationRequest =
    await generate_random_ecommerce_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          ecommerce_order_item_id: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 10,
            wordMax: 20,
          }),
        } satisfies IEcommerceCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  // Seller approves cancellation (triggers restoration)
  const restorationResponse =
    await generate_random_ecommerce_seller_cancellation_requests_responses_create(
      sellerConnection,
      {
        params: { cancellationRequestId: cancellationRequest.id },
        body: {
          decision: "approved",
          response_reason: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 10,
            wordMax: 20,
          }),
        } satisfies IEcommerceCancellationResponseRecord.ICreate,
      },
    );
  typia.assert(restorationResponse);
  // Retrieve the inventory restoration record
  const restoration =
    await api.functional.ecommerce.seller.modification_inventory_restorations.at(
      sellerConnection,
      {
        restorationId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(restoration);
  // Validate restoration properties
  TestValidator.equals(
    "restoration has cancellation trigger",
    restoration.cancellationRequest !== null,
    true,
  );
  TestValidator.equals(
    "restoration has no refund trigger",
    restoration.refundRequest,
    null,
  );
  TestValidator.equals(
    "quantity restored matches cancelled",
    restoration.quantity_restored,
    quantity,
  );
  TestValidator.predicate(
    "restoration reason indicates cancellation",
    restoration.restoration_reason.toLowerCase().includes("cancellation"),
  );
  TestValidator.predicate(
    "created_at timestamp populated",
    restoration.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp populated",
    restoration.updated_at.length > 0,
  );
}
