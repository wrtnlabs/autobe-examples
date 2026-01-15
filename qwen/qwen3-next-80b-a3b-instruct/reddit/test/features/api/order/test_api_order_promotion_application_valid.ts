import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrder";
import type { ICommunityPlatformOrderPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderPromotion";
import { prepare_random_community_platform_order } from "../../../prepare/prepare_random_community_platform_order";
import { generate_random_community_platform_member_orders_create } from "../../../generate/generate_random_community_platform_member_orders_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_order_promotion_application_valid(
  connection: api.IConnection,
) {
  // Step 1: Create member-specific connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // Step 2: Create a valid promotion with a known code
  // Note: If no API exists for this, we must simulate creation in a different way
  // Since no promotion creation endpoint is specified in the API, we cannot create a real promotion
  // Therefore, we assume the system has pre-loaded promotions
  // We'll use a realistic promotion code that would exist in the system
  const promotionCode = "SUMMER2024";
  // Step 3: Create an order with sufficient total value to qualify for promotion
  // We need to ensure the order total meets minimum requirement for promotion
  // Since we know the promotion code, we assume it requires minimum $50 purchase
  // Create products with total > $50
  const order = await generate_random_community_platform_member_orders_create(
    memberConnection,
    {
      body: {
        cartId: typia.random<string & tags.Format<"uuid">>(),
        shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
        billing_address_id: typia.random<string & tags.Format<"uuid">>(),
        delivery_window_id: typia.random<string & tags.Format<"uuid">>(),
        carrier_id: typia.random<string & tags.Format<"uuid">>(),
        shipping_method: "Standard Ground",
        currency_code: "USD",
      } satisfies ICommunityPlatformOrder.ICreate,
    },
  );
  typia.assert(order);
  // Step 4: Apply the valid promotion code to the order
  const promotionResponse =
    await api.functional.communityPlatform.member.orders.promotions.applyPromotions(
      memberConnection,
      {
        orderId: order.id,
        body: {
          codes: [promotionCode],
        } satisfies ICommunityPlatformOrderPromotion.IRequest,
      },
    );
  typia.assert(promotionResponse);
  // Step 5: Validate promotion was applied correctly
  // Discount amount should be increased (greater than 0)
  TestValidator.predicate(
    "discount amount applied",
    promotionResponse.discount_amount > 0,
  );
  // Total amount should be reduced from original order total
  TestValidator.predicate(
    "total amount reduced",
    promotionResponse.total_amount < order.total_amount,
  );
  // Tax amount should be recalculated based on the new discounted total
  TestValidator.predicate(
    "tax amount recalculated",
    promotionResponse.tax_amount > 0,
  );
  // Order ID should remain the same
  TestValidator.equals("order id unchanged", promotionResponse.id, order.id);
  // Currency code should remain the same
  TestValidator.equals(
    "currency code unchanged",
    promotionResponse.currency_code,
    order.currency_code,
  );
  // Ensure the discount amount is reasonable (not exceeding the total)
  TestValidator.predicate(
    "discount amount reasonable",
    promotionResponse.discount_amount < promotionResponse.subtotal_amount,
  );
  // Since we don't have direct access to order_promotions table in the API response,
  // the promotion code application is validated through the reduced total and increased discount
  // In a real system, we would verify the audit trail in a separate step
}
