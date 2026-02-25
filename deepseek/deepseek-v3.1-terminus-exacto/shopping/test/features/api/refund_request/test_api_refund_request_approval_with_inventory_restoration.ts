import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceDeliveryConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDeliveryConfirmation";
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
import type { IEcommerceRefundRequestStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequestStatus";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceRefundRequestStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceRefundRequestStatus";
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
import { generate_random_ecommerce_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_customer_refund_requests_create";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { generate_random_ecommerce_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_seller_products_variants_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";
import { prepare_random_ecommerce_refund_request } from "../../../prepare/prepare_random_ecommerce_refund_request";

export async function test_api_refund_request_approval_with_inventory_restoration(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create authenticated customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // Step 2: Create authenticated seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // Step 3: Seller creates product
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: 100.0,
        category_id: categoryId,
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // Step 4: Seller creates product variant with inventory
  const variant =
    await generate_random_ecommerce_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku: "TEST-SKU-001",
          option_values: JSON.stringify({ size: "large", color: "red" }),
          price_override: null,
          quantity: 10,
        } satisfies IEcommerceProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  const originalQuantity = variant.quantity;
  // NOTE: Due to missing implementation details for checkout and delivery confirmation,
  // this test focuses on the core refund approval workflow validation
  // The full end-to-end workflow requires additional API endpoints not provided
  // Step 5: Customer submits refund request (simulating after successful order/delivery)
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const refundRequest =
    await generate_random_ecommerce_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItemId,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // Validate initial refund request state
  TestValidator.predicate(
    "refund request should have seller relationship",
    refundRequest.seller.id === seller.id,
  );
  TestValidator.predicate(
    "refund request should have customer relationship",
    refundRequest.customer.id === customer.id,
  );
  // Step 6: Seller approves refund request
  const statusUpdate =
    await api.functional.ecommerce.seller.refund_requests.statuses.updateStatus(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          decision: "approved",
          reason: "Refund approved due to customer dissatisfaction",
        } satisfies IEcommerceRefundRequest.IUpdateStatus,
      },
    );
  typia.assert(statusUpdate);
  // Step 7: Validate status change workflow
  TestValidator.predicate(
    "status history should contain approved status",
    statusUpdate.data.some(
      (status: IEcommerceRefundRequestStatus.ISummary) =>
        status.status === "approved",
    ),
  );
  // Verify pagination structure exists
  TestValidator.predicate(
    "pagination should have valid structure",
    statusUpdate.pagination.current > 0 && statusUpdate.pagination.limit > 0,
  );
  TestValidator.predicate(
    "status history should have records",
    statusUpdate.data.length > 0,
  );
  // Verify the approval status has valid timestamp and reason
  const approvedStatus = statusUpdate.data.find(
    (status: IEcommerceRefundRequestStatus.ISummary) =>
      status.status === "approved",
  );
  if (approvedStatus) {
    TestValidator.predicate(
      "approved status should have timestamp",
      typeof approvedStatus.created_at === "string" &&
        approvedStatus.created_at.length > 0,
    );
    TestValidator.predicate(
      "approved status should have reason",
      typeof approvedStatus.reason === "string" &&
        approvedStatus.reason.length > 0,
    );
  }
  // NOTE: Inventory restoration validation would require additional API endpoints
  // to check variant quantities after refund approval, which are not provided
  // in the current SDK interface
}
