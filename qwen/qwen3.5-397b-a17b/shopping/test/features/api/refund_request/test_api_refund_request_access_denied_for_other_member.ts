import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_member_cart_items_create } from "../../../generate/generate_random_shopping_mall_member_cart_items_create";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_member_post_purchase_refund_requests_create } from "../../../generate/generate_random_shopping_mall_member_post_purchase_refund_requests_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test refund request access denial for other member's refund request.
 *
 * Validates that a member cannot access another member's refund request and receives 404 Not Found instead of 403 Forbidden. This security pattern prevents information leakage about the existence of other members' refund requests.
 *
 * The test creates two separate member accounts (Member A and Member B), each with their own orders and refund requests. Member A's refund request serves as the target for unauthorized access attempts by Member B.
 *
 * 1. Member A registers and authenticates, places an order, and creates a refund request.
 * 2. Member B registers and authenticates, places a separate order, and creates their own refund request.
 * 3. Member B attempts to access Member A's refund request - expects 404 Not Found.
 * 4. Member B accesses their own refund request - expects 200 OK with valid data.
 * 5. Validates ownership boundary is properly enforced without leaking existence information.
 */
export async function test_api_refund_request_access_denied_for_other_member(
  connection: api.IConnection,
): Promise<void> {
  // ============================================================
  // 1. Setup: Create Member A (owner of target refund request)
  // ============================================================
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberA);
  // ============================================================
  // 2. Setup: Create Member B (will attempt unauthorized access)
  // ============================================================
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberB);
  // ============================================================
  // 3. Setup: Create Seller account for product and fulfillment
  // ============================================================
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // ============================================================
  // 4. Seller creates product with variants
  // ============================================================
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Get first variant for cart items
  const variant = product.variants[0];
  typia.assert(variant);
  // ============================================================
  // 5. Member A: Add product to cart and place order
  // ============================================================
  const memberACartItem =
    await generate_random_shopping_mall_member_cart_items_create(
      memberAConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity: 1,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(memberACartItem);
  // Member A needs a shipping address - use random UUID for test
  const memberAOrder = await generate_random_shopping_mall_member_orders_create(
    memberAConnection,
    {
      body: {
        shopping_mall_customer_address_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(memberAOrder);
  // Get Member A's order item for refund request
  const memberAOrderItem = memberAOrder.orderItems[0];
  typia.assert(memberAOrderItem);
  // ============================================================
  // 6. Seller creates shipment for Member A's order
  // ============================================================
  const memberAShipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: {
          orderId: memberAOrder.id,
        },
        body: {
          order_item_ids: [memberAOrderItem.id],
          carrier_name: RandomGenerator.name(2),
          tracking_number: typia.random<string>(),
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(memberAShipment);
  // ============================================================
  // 7. Member A creates refund request for delivered order item
  // ============================================================
  const memberARefundRequest =
    await generate_random_shopping_mall_member_post_purchase_refund_requests_create(
      memberAConnection,
      {
        body: {
          order_item_id: memberAOrderItem.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(memberARefundRequest);
  // ============================================================
  // 8. Member B: Add product to cart and place order
  // ============================================================
  const memberBCartItem =
    await generate_random_shopping_mall_member_cart_items_create(
      memberBConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity: 1,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(memberBCartItem);
  const memberBOrder = await generate_random_shopping_mall_member_orders_create(
    memberBConnection,
    {
      body: {
        shopping_mall_customer_address_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(memberBOrder);
  const memberBOrderItem = memberBOrder.orderItems[0];
  typia.assert(memberBOrderItem);
  // ============================================================
  // 9. Seller creates shipment for Member B's order
  // ============================================================
  const memberBShipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: {
          orderId: memberBOrder.id,
        },
        body: {
          order_item_ids: [memberBOrderItem.id],
          carrier_name: RandomGenerator.name(2),
          tracking_number: typia.random<string>(),
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(memberBShipment);
  // ============================================================
  // 10. Member B creates their own refund request
  // ============================================================
  const memberBRefundRequest =
    await generate_random_shopping_mall_member_post_purchase_refund_requests_create(
      memberBConnection,
      {
        body: {
          order_item_id: memberBOrderItem.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(memberBRefundRequest);
  // ============================================================
  // 11. TEST: Member B attempts to access Member A's refund request
  // ============================================================
  await TestValidator.error(
    "Member B cannot access Member A's refund request",
    async () => {
      await api.functional.shoppingMall.member.post_purchase.refund_requests.at(
        memberBConnection,
        {
          id: memberARefundRequest.id,
        },
      );
    },
  );
  // ============================================================
  // 12. TEST: Member B can access their own refund request
  // ============================================================
  const memberBAccessResult =
    await api.functional.shoppingMall.member.post_purchase.refund_requests.at(
      memberBConnection,
      {
        id: memberBRefundRequest.id,
      },
    );
  typia.assert(memberBAccessResult);
  // Validate Member B's refund request details
  TestValidator.equals(
    "Member B refund request ID matches",
    memberBAccessResult.id,
    memberBRefundRequest.id,
  );
  TestValidator.equals(
    "Member B refund request reason matches",
    memberBAccessResult.reason,
    memberBRefundRequest.reason,
  );
  TestValidator.equals(
    "Member B refund request order item matches",
    memberBAccessResult.orderItem.id,
    memberBOrderItem.id,
  );
}
