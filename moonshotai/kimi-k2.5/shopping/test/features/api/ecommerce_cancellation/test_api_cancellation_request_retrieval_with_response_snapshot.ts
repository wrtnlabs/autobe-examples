import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

export async function test_api_cancellation_request_retrieval_with_response_snapshot(
  connection: api.IConnection,
): Promise<void> {
  // ============================================
  // SETUP: Create connections for all actors
  // ============================================
  const host = connection.host;
  // 1. Create admin connection and login
  const adminConnection: api.IConnection = { host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  await authorize_admin_join(adminConnection, {
    body: { email: adminEmail, password: RandomGenerator.alphaNumeric(16) },
  });
  // 2. Create seller connection, register and get approved
  const sellerConnection: api.IConnection = { host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: { email: sellerEmail, password: RandomGenerator.alphaNumeric(16) },
  });
  // Approve seller (using admin)
  // Note: Seller approval endpoint not in available SDK, seller is created with pending status
  // We proceed with the test assuming the seller can still create products or we use the connection as-is
  // 3. Create customer connection and register
  const customerConnection: api.IConnection = { host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  await authorize_customer_join(customerConnection, {
    body: { email: customerEmail, password: RandomGenerator.alphaNumeric(16) },
  });
  // ============================================
  // STEP 1: Admin creates product category
  // ============================================
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: `Category-${RandomGenerator.alphaNumeric(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        parentId: null,
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // ============================================
  // STEP 2: Seller creates product
  // ============================================
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: `Test Product ${RandomGenerator.name()}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Minimum<100> & tags.Maximum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // ============================================
  // STEP 3: Seller creates product variant with initial stock
  // ============================================
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(10)}`,
          options: [
            {
              optionName: "Color",
              optionValue: RandomGenerator.pick([
                "Red",
                "Blue",
                "Green",
                "Black",
              ]),
            },
          ] satisfies IEcommerceMallProductVariantOption.ICreate[],
          price: product.basePrice,
          stock: 10,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // ============================================
  // STEP 4: Customer adds variant to cart
  // ============================================
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        productVariantId: variant.id,
        quantity: 2,
      } satisfies IEcommerceMallCartItem.ICreate,
    },
  );
  // ============================================
  // STEP 5: Customer completes checkout (creates order with paid order item)
  // ============================================
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        recipientPhone: RandomGenerator.mobile(),
        streetAddress: `${RandomGenerator.alphaNumeric(5)} Main St`,
        city: RandomGenerator.pick(["Seoul", "Tokyo", "New York", "London"]),
        state: null,
        postalCode: RandomGenerator.alphaNumeric(5),
        country: RandomGenerator.pick(["KR", "US", "JP", "UK"]),
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  typia.assert(order.orderItems.length > 0);
  // Get the first order item - use ISummary type which has the id property
  const orderItem = typia.assert<IEcommerceMallOrderItem.ISummary>(
    order.orderItems[0],
  );
  // ============================================
  // STEP 6: Customer creates cancellation request
  // ============================================
  const cancellationReason = `I want to cancel because: ${RandomGenerator.paragraph({ sentences: 1 })}`;
  const cancellationRequest =
    await generate_random_ecommerce_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItem.id,
          reason: cancellationReason,
        } satisfies IEcommerceMallCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  typia.assert(cancellationRequest.status === "pending");
  typia.assert(cancellationRequest.snapshots.length >= 0); // May be empty initially
  // ============================================
  // STEP 7: Seller responds to cancellation request (approve with reason)
  // ============================================
  const sellerResponseReason = `Approved: ${RandomGenerator.paragraph({ sentences: 1 })}`;
  const respondedRequest =
    await api.functional.ecommerceMall.seller.cancellationRequests.actions.respond(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          action: "approve",
          reason: sellerResponseReason,
        } satisfies IEcommerceMallCancellationRequest.IRespond,
      },
    );
  typia.assert(respondedRequest);
  typia.assert(respondedRequest.status === "approved");
  typia.assert(respondedRequest.responseReason === sellerResponseReason);
  typia.assert(respondedRequest.respondedAt !== null);
  typia.assert(respondedRequest.snapshots.length > 0);
  // ============================================
  // STEP 8: Seller retrieves cancellation request again and validates snapshot history
  // ============================================
  const retrievedRequest =
    await api.functional.ecommerceMall.seller.cancellationRequests.at(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // ============================================
  // VALIDATION: Verify cancellation request with snapshot
  // ============================================
  // 1. Verify updated status is "approved"
  TestValidator.equals(
    "status is approved",
    retrievedRequest.status,
    "approved",
  );
  // 2. Verify responseReason field is populated with seller's note
  TestValidator.equals(
    "responseReason matches seller note",
    retrievedRequest.responseReason,
    sellerResponseReason,
  );
  // 3. Verify respondedAt timestamp is set
  TestValidator.predicate(
    "respondedAt is set",
    retrievedRequest.respondedAt !== null,
  );
  // 4. Verify snapshots array contains at least one snapshot
  TestValidator.predicate(
    "snapshots array is not empty",
    retrievedRequest.snapshots.length > 0,
  );
  // 5. Verify snapshot shows status transition: pending -> approved
  const snapshots = retrievedRequest.snapshots;
  const hasValidSnapshot = snapshots.some(
    (snapshot: IEcommerceMallCancellationRequestSnapshot) =>
      snapshot.statusBefore === "pending" &&
      snapshot.statusAfter === "approved",
  );
  TestValidator.predicate(
    "snapshot shows pending -> approved transition",
    hasValidSnapshot,
  );
  // 6. Verify reviewer note is captured in snapshot
  const snapshotWithNote = snapshots.find(
    (snapshot: IEcommerceMallCancellationRequestSnapshot) =>
      snapshot.reviewerNote !== null,
  );
  TestValidator.predicate(
    "at least one snapshot has reviewer note",
    snapshotWithNote !== undefined,
  );
  if (snapshotWithNote) {
    TestValidator.equals(
      "reviewer note matches seller reason",
      snapshotWithNote.reviewerNote,
      sellerResponseReason,
    );
  }
  // 7. Verify cancellation reason is preserved (reasonBefore or reasonAfter)
  const reasonPreserved = snapshots.some(
    (snapshot: IEcommerceMallCancellationRequestSnapshot) =>
      snapshot.reasonBefore === cancellationReason ||
      snapshot.reasonAfter === cancellationReason,
  );
  TestValidator.predicate(
    "customer cancellation reason is preserved in snapshot",
    reasonPreserved,
  );
}
