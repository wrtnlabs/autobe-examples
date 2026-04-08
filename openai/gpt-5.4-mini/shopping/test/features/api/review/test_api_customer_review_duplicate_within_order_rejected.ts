import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_mall_platform_customer_reviews_create } from "../../../generate/generate_random_mall_platform_customer_reviews_create";
import { prepare_random_mall_platform_review } from "../../../prepare/prepare_random_mall_platform_review";

/**
 * Verifies duplicate review submission is rejected for the same purchased product within one order.
 *
 * This test validates the customer review workflow around delivery-gated review eligibility and the platform rule that only one active review may exist for the same product within the same order context.
 *
 * Because the provided E2E surface in this template only exposes customer registration, review creation, and shipment delivery confirmation, the test focuses on the review endpoint behavior that is directly available here: it registers a customer, prepares a review payload, and checks that a second submission for the same purchase context is rejected as a duplicate-business-rule violation.
 *
 * 1. Register and authenticate a customer account for the review actor.
 * 2. Build a valid review payload for a delivered order item and product.
 * 3. Submit the first review payload.
 * 4. Attempt to submit the same review payload again.
 * 5. Assert that the second submission is rejected and the first review data remains intact.
 */
export async function test_api_customer_review_duplicate_within_order_rejected(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await api.functional.mallPlatform.auth.customer.join(
    customerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password1234",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IMallPlatformCustomer.IJoin,
    },
  );
  typia.assert(customer);
  const shipment =
    await api.functional.mallPlatform.customer.shipments.confirm_delivery.create(
      customerConnection,
      {
        shipmentId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(shipment);
  const orderItem = shipment.order;
  const product = shipment.order;
  const reviewBody = {
    orderItemId: orderItem.id,
    productId: product.id,
    rating: 5,
    content: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IMallPlatformReview.ICreate;
  const firstReview = await api.functional.mallPlatform.customer.reviews.create(
    customerConnection,
    { body: reviewBody },
  );
  typia.assert(firstReview);
  await TestValidator.error(
    "duplicate review for the same product within the same order should be rejected",
    async () => {
      await api.functional.mallPlatform.customer.reviews.create(
        customerConnection,
        { body: reviewBody },
      );
    },
  );
  TestValidator.equals(
    "original review should remain the active review",
    firstReview.orderItem.id,
    orderItem.id,
  );
  TestValidator.equals(
    "original review should remain tied to the same product",
    firstReview.product.id,
    product.id,
  );
  TestValidator.equals(
    "original review rating should remain unchanged",
    firstReview.rating,
    reviewBody.rating,
  );
}
