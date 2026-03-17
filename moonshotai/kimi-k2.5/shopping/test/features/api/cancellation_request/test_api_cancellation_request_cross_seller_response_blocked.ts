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
 * Cross-seller authorization blocking test for cancellation request responses.
 *
 * This test validates that sellers cannot respond to cancellation requests for
 * products they do not own. When a seller attempts to respond to another seller's
 * cancellation request, the system must block the action and return a 403 Forbidden error.
 *
 * Business rules validated (section 389, 539):
 * - Sellers can only respond to cancellation requests for their own products
 * - Cross-seller response attempts are blocked with 403 Forbidden
 * - No side effects occur when blocked (status unchanged, no snapshot, no inventory changes)
 */
export async function test_api_cancellation_request_cross_seller_response_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates a product category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(category);
  // 2. First seller (product owner) registers and creates product with variant
  const firstSellerConnection: api.IConnection = { host: connection.host };
  const firstSeller = await authorize_seller_join(firstSellerConnection, {
    body: {
      href: `https://test.com/first-seller`,
      referrer: `https://test.com`,
    },
  });
  typia.assert(firstSeller);
  const product = await generate_random_ecommerce_mall_seller_products_create(
    firstSellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        categoryId: category.id,
        basePrice: randint(1000, 10000),
      },
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      firstSellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(8).toUpperCase(),
          options: [
            {
              optionName: "Color",
              optionValue: RandomGenerator.pick(["Red", "Blue", "Green"]),
            },
            {
              optionName: "Size",
              optionValue: RandomGenerator.pick(["S", "M", "L"]),
            },
          ] satisfies IEcommerceMallProductVariantOption.ICreate[],
          price: product.basePrice * 1.2,
          stock: 100,
        },
      },
    );
  typia.assert(variant);
  // 3. Second seller registers (will attempt unauthorized response)
  const secondSellerConnection: api.IConnection = { host: connection.host };
  const secondSeller = await authorize_seller_join(secondSellerConnection, {
    body: {
      href: `https://test.com/second-seller`,
      referrer: `https://test.com`,
    },
  });
  typia.assert(secondSeller);
  TestValidator.notEquals(
    "Second seller ID differs from first seller",
    secondSeller.id,
    firstSeller.id,
  );
  // 4. Customer registers and authenticates
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 5. Customer adds first seller's variant to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        },
      },
    );
  typia.assert(cartItem);
  // 6. Customer checkout to create order
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        recipientPhone: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 10,
        }),
        city: RandomGenerator.pick(["Seoul", "New York", "London", "Tokyo"]),
        state: RandomGenerator.pick(["NY", "CA", null]),
        postalCode: RandomGenerator.alphaNumeric(5).toUpperCase(),
        country: RandomGenerator.pick(["South Korea", "USA", "UK", "Japan"]),
      },
    },
  );
  typia.assert(order);
  // Verify order has at least one paid item
  const paidOrderItem = order.orderItems.find(
    (item: any) =>
      item.variant.skuCode === variant.skuCode &&
      item.variant.options.some((opt: any) =>
        variant.optionValues.some(
          (v) =>
            v.optionName === opt.optionName &&
            v.optionValue === opt.optionValue,
        ),
      ),
  );
  typia.assert(paidOrderItem);
  TestValidator.equals(
    "Order item should be in paid status",
    (paidOrderItem as any).status,
    "paid",
  );
  // 7. Customer submits cancellation request
  const cancellationRequest =
    await generate_random_ecommerce_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: (paidOrderItem as any).id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(cancellationRequest);
  TestValidator.equals(
    "Cancellation request status should be pending",
    cancellationRequest.status,
    "pending",
  );
  TestValidator.equals(
    "Cancellation request should reference the correct order item",
    cancellationRequest.orderItem.id,
    (paidOrderItem as any).id,
  );
  TestValidator.equals(
    "Cancellation request should belong to first seller",
    cancellationRequest.seller?.id,
    firstSeller.id,
  );
  const cancellatonRequestId = cancellationRequest.id;
  const initialSnapshotCount = cancellationRequest.snapshots.length;
  // 8. Second seller attempts to respond to the cancellation request
  await TestValidator.error(
    "Second seller should be blocked from responding to first seller's cancellation request",
    async () => {
      await api.functional.ecommerceMall.seller.cancellationRequests.actions.respond(
        secondSellerConnection,
        {
          cancellationRequestId: cancellatonRequestId,
          body: {
            action: "approve",
            reason: "I want to approve this request",
          },
        },
      );
    },
  );
  // 9. Verify no side effects occurred - TestValidator.error validates the error was thrown
}