import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallReviewEligibility } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewEligibility";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
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
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_reviews_create } from "../../../generate/generate_random_ecommerce_mall_customer_reviews_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

/**
 * Test that a customer CANNOT write a review for an order item they have already reviewed.
 *
 * This test validates the review eligibility API returns eligible=false with
 * reason='REVIEW_ALREADY_EXISTS' when the customer has already submitted a review.
 */
export async function test_api_review_customer_already_reviewed(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // Step 2: Create product as seller
  const product =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
    );
  typia.assert(product);
  // Get a product variant ID from the created product
  const variantId = (product.variants[0]?.id ??
    typia.random<string & tags.Format<"uuid">>()) satisfies string &
    tags.Format<"uuid">;
  // Step 3: Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Step 4: Add product to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variantId,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem);
  // Step 5: Create shipment - a valid orderItemId is needed
  // Using a random UUID since the generate functions handle creating the order context
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        orderItemIds: [orderItemId],
        carrierName: "FedEx",
        trackingNumber: typia.random<
          string & tags.Pattern<"^[A-Z0-9]{10,20}$">
        >(),
      },
    },
  );
  typia.assert(shipment);
  // Get the actual orderItemId from shipment (if available), otherwise use the one we sent
  const actualOrderItemId =
    shipment.shipment_items[0]?.orderItem.id ?? orderItemId;
  // Step 6: Customer submits a review for the order item
  const review = await generate_random_ecommerce_mall_customer_reviews_create(
    customerConnection,
    {
      body: {
        orderItemId: actualOrderItemId,
        rating: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        content: null,
      },
    },
  );
  typia.assert(review);
  // Step 7: Check review eligibility - should return REVIEW_ALREADY_EXISTS
  const eligibility: IEcommerceMallReviewEligibility =
    await api.functional.ecommerceMall.customer.order_items.can_write_review.at(
      customerConnection,
      { orderItemId: actualOrderItemId },
    );
  typia.assert(eligibility);
  // Step 8: Validate eligibility-check response using TestValidator
  TestValidator.equals("eligible should be false", eligibility.eligible, false);
  TestValidator.equals(
    "reason should be REVIEW_ALREADY_EXISTS",
    eligibility.reason,
    "REVIEW_ALREADY_EXISTS",
  );
}
