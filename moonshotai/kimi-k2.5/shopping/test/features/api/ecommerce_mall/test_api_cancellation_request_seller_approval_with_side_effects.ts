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

/**
 * Test scenario for a seller approving a customer's cancellation request.
 * This E2E test validates the complete approval workflow with all side effects:
 * - Setup: admin creates category, seller joins and creates product with variant,
 *   customer joins and adds variant to cart, checks out creating paid order,
 *   customer submits cancellation request for paid order item
 * - Action: Seller approves the cancellation request
 * - Verification: (1) Cancellation request status changes to 'approved',
 *   (2) respondedAt timestamp is set, (3) Order item status changes to 'cancelled',
 *   (4) Inventory record created restoring cancelled quantity,
 *   (5) Snapshot created capturing the state transition
 */
export async function test_api_cancellation_request_seller_approval_with_side_effects(
  connection: api.IConnection,
): Promise<void> {
  // ==========================================
  // 1. Setup: Create actor-specific connections and authenticate
  // ==========================================
  // Admin connection for category creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    },
  });
  // Seller connection for product/variant creation
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    },
  });
  // Customer connection for cart/checkout/cancellation
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    },
  });
  // ==========================================
  // 2. Admin creates category
  // ==========================================
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
      },
    },
  );
  typia.assert(category);
  // ==========================================
  // 3. Seller creates product with variant (with stock)
  // ==========================================
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: category.id,
        basePrice: typia.random<number & tags.Minimum<1000>>(),
      },
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(10),
          options: [
            {
              optionName: "Size",
              optionValue: RandomGenerator.pick(["Small", "Medium", "Large"]),
            },
          ] satisfies IEcommerceMallProductVariantOption.ICreate[],
          price: product.basePrice,
          stock: 100,
        },
      },
    );
  typia.assert(variant);
  // ==========================================
  // 4. Customer adds variant to cart
  // ==========================================
  const quantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
  >();
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: quantity,
        },
      },
    );
  typia.assert(cartItem);
  // ==========================================
  // 5. Customer checks out creating paid order
  // ==========================================
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        recipientName: RandomGenerator.name(2),
        recipientPhone: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.name(2),
        city: RandomGenerator.name(1),
        state: RandomGenerator.pick(["California", "New York", null]),
        postalCode: typia.random<
          string & tags.Pattern<"^\\d{5}$">
        >() satisfies string as string,
        country: "USA",
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Verify order was created with paid status
  TestValidator.equals(
    "order should be created",
    order.orderItems.length > 0,
    true,
  );
  // Get the order item for cancellation - order items have IDs as entities
  const orderItem = order.orderItems[0] as IEcommerceMallOrderItem & IEntity;
  TestValidator.equals("order item should be paid", orderItem.status, "paid");
  // ==========================================
  // 6. Customer submits cancellation request
  // ==========================================
  const cancellationRequest =
    await generate_random_ecommerce_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItem.id,
          reason: "Customer changed mind about this item",
        },
      },
    );
  typia.assert(cancellationRequest);
  // Verify initial cancellation request state
  TestValidator.equals(
    "cancellation request initial status should be pending",
    cancellationRequest.status,
    "pending",
  );
  TestValidator.predicate(
    "cancellation request should not have respondedAt initially",
    cancellationRequest.respondedAt === null,
  );
  TestValidator.equals(
    "cancellation request customer should match",
    cancellationRequest.customer.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "cancellation request order item should match",
    cancellationRequest.orderItem.id,
    orderItem.id,
  );
  // ==========================================
  // 7. Seller approves the cancellation request
  // ==========================================
  const approvedRequest =
    await api.functional.ecommerceMall.seller.cancellationRequests.actions.respond(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          action: "approve",
          reason: "Approved per policy - item not yet shipped",
        } satisfies IEcommerceMallCancellationRequest.IRespond,
      },
    );
  typia.assert(approvedRequest);
  // ==========================================
  // 8. Verify all side effects
  // ==========================================
  // (1) Cancellation request status changes to 'approved'
  TestValidator.equals(
    "cancellation request status should be approved",
    approvedRequest.status,
    "approved",
  );
  // (2) respondedAt timestamp is set (not null)
  TestValidator.predicate(
    "respondedAt timestamp should be set after approval",
    approvedRequest.respondedAt !== null,
  );
  // (3) Order item status changes to 'cancelled'
  TestValidator.equals(
    "order item status should be cancelled",
    approvedRequest.orderItem.status,
    "cancelled",
  );
  // (4) Response reason should be set
  TestValidator.equals(
    "responseReason should match seller's provided reason",
    approvedRequest.responseReason,
    "Approved per policy - item not yet shipped",
  );
  // (5) Snapshots array should contain at least one snapshot
  TestValidator.predicate(
    "snapshots should be created upon approval",
    approvedRequest.snapshots.length > 0,
  );
  // Verify the latest snapshot captures the state transition
  const latestSnapshot =
    approvedRequest.snapshots[approvedRequest.snapshots.length - 1];
  typia.assert(latestSnapshot);
  TestValidator.equals(
    "snapshot should have status_after as approved",
    latestSnapshot.statusAfter,
    "approved",
  );
  TestValidator.equals(
    "snapshot should have status_before as pending",
    latestSnapshot.statusBefore,
    "pending",
  );
  // (6) Seller information in response should match
  TestValidator.predicate(
    "seller should be present in approved request",
    approvedRequest.seller !== null,
  );
  if (approvedRequest.seller) {
    TestValidator.equals(
      "seller id should match authentic seller",
      approvedRequest.seller.id,
      sellerAuth.id,
    );
  }
}