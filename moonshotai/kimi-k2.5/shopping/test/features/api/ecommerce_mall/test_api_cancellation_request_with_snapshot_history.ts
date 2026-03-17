import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_cancellation_requests_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_checkout_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_registrations_create } from "../../../generate/generate_random_ecommerce_mall_seller_registrations_create";
import { generate_random_ecommerce_mall_seller_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_variants_inventory_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";
import { prepare_random_ecommerce_mall_seller_registration } from "../../../prepare/prepare_random_ecommerce_mall_seller_registration";

export async function test_api_cancellation_request_with_snapshot_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin connection and create admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Setup seller connection and create seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Seller submits registration application
  await generate_random_ecommerce_mall_seller_registrations_create(
    sellerConnection,
    {},
  );
  // 4. Admin approves seller registration
  await api.functional.ecommerceMall.admin.sellers.registrations.review(
    adminConnection,
    {
      registrationId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        status: "approved",
        rejection_reason: null,
      } satisfies IEcommerceMallSellerRegistration.IReview,
    },
  );
  // 5. Create product category (admin only)
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  // 6. Seller creates product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      } satisfies Partial<IEcommerceMallProduct.ICreate>,
    },
  );
  // 7. Seller creates product variant
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          stock: 100,
        } satisfies Partial<IEcommerceMallProductVariant.ICreate>,
      },
    );
  // 8. Seller adds inventory to variant
  await generate_random_ecommerce_mall_seller_variants_inventory_create(
    sellerConnection,
    {
      params: { variantId: variant.id },
      body: {
        quantity: 100,
        reason: "Initial stock",
      } satisfies Partial<IEcommerceMallInventoryRecord.ICreate>,
    },
  );
  // 9. Setup customer connection and create customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 10. Customer adds variant to cart
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        productVariantId: variant.id,
        quantity: 1,
      } satisfies Partial<IEcommerceMallCartItem.ICreate>,
    },
  );
  // 11. Customer checkout to create order
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        recipientName: "Test Recipient",
        recipientPhone: "01012345678",
        streetAddress: "123 Test Street",
        city: "Test City",
        state: null,
        postalCode: "12345",
        country: "Test Country",
      } satisfies Partial<IEcommerceMallOrder.ICreate>,
    },
  );
  // 12. Get order item from created order
  const orderItem = typia.assert<IEcommerceMallOrderItem.ISummary>(
    order.orderItems[0],
  );
  // 13. Customer creates cancellation request for the order item
  const cancellationRequest =
    await generate_random_ecommerce_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItem.id,
          reason: "Changed my mind about this purchase",
        } satisfies Partial<IEcommerceMallCancellationRequest.ICreate>,
      },
    );
  // 14. Seller responds to cancellation request (approves with reason)
  await api.functional.ecommerceMall.seller.cancellationRequests.actions.respond(
    sellerConnection,
    {
      cancellationRequestId: cancellationRequest.id,
      body: {
        action: "approve",
        reason: "Approved as per customer request",
      } satisfies IEcommerceMallCancellationRequest.IRespond,
    },
  );
  // 15. Customer retrieves cancellation request with snapshot history
  const retrievedRequest =
    await api.functional.ecommerceMall.customer.cancellationRequests.at(
      customerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
      },
    );
  // 16. Validate response structure
  typia.assert(retrievedRequest);
  // 17. Verify snapshots array exists and has entries
  TestValidator.predicate(
    "snapshots array exists",
    Array.isArray(retrievedRequest.snapshots),
  );
  TestValidator.predicate(
    "snapshots has at least one entry",
    retrievedRequest.snapshots.length > 0,
  );
  // 18. Verify each snapshot has required fields
  for (const snapshot of retrievedRequest.snapshots) {
    TestValidator.predicate(
      "snapshot has statusBefore",
      typeof snapshot.statusBefore === "string",
    );
    TestValidator.predicate(
      "snapshot has statusAfter",
      typeof snapshot.statusAfter === "string",
    );
    TestValidator.predicate(
      "snapshot has reasonBefore",
      snapshot.reasonBefore !== undefined,
    );
    TestValidator.predicate(
      "snapshot has reasonAfter",
      snapshot.reasonAfter !== undefined,
    );
    TestValidator.predicate(
      "snapshot has reviewerNote",
      snapshot.reviewerNote !== undefined,
    );
    TestValidator.predicate(
      "snapshot has createdAt",
      typeof snapshot.createdAt === "string",
    );
  }
  // 19. Verify snapshots are ordered by created_at descending (newest first)
  if (retrievedRequest.snapshots.length > 1) {
    for (let i = 0; i < retrievedRequest.snapshots.length - 1; i++) {
      const current = new Date(
        retrievedRequest.snapshots[i].createdAt,
      ).getTime();
      const next = new Date(
        retrievedRequest.snapshots[i + 1].createdAt,
      ).getTime();
      TestValidator.predicate(
        `snapshots ordered by created_at descending at index ${i}`,
        current >= next,
      );
    }
  }
  // 20. Verify the first (most recent) snapshot captures the approval transition
  const latestSnapshot = retrievedRequest.snapshots[0];
  TestValidator.equals(
    "statusBefore is pending",
    latestSnapshot.statusBefore,
    "pending",
  );
  TestValidator.equals(
    "statusAfter is approved",
    latestSnapshot.statusAfter,
    "approved",
  );
  TestValidator.equals(
    "reviewerNote matches seller response",
    latestSnapshot.reviewerNote,
    "Approved as per customer request",
  );
  // 21. Verify customer and order item information is captured
  TestValidator.predicate(
    "customer info exists",
    retrievedRequest.customer !== null,
  );
  TestValidator.predicate(
    "order item info exists",
    retrievedRequest.orderItem !== null,
  );
  TestValidator.equals(
    "order item ID matches",
    retrievedRequest.orderItem.id,
    orderItem.id,
  );
}
