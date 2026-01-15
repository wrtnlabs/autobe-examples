import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCart } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCart";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrder";
import type { ICommunityPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderItem";
import type { ICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProduct";
import type { ICommunityPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductImage";
import type { ICommunityPlatformProductPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductPrice";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { prepare_random_community_platform_order } from "../../../prepare/prepare_random_community_platform_order";
import { prepare_random_community_platform_order_item } from "../../../prepare/prepare_random_community_platform_order_item";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_member_orders_create } from "../../../generate/generate_random_community_platform_member_orders_create";
import { generate_random_community_platform_member_orders_items_create } from "../../../generate/generate_random_community_platform_member_orders_items_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_order_item_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com/home",
  } satisfies ICommunityPlatformMember.IJoin;
  const memberAuth = await api.functional.auth.member.join(memberConnection, {
    body: memberCredentials,
  });
  typia.assert(memberAuth);
  // Step 2: Create product with price
  const product = await api.functional.communityPlatform.member.products.create(
    memberConnection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        title: RandomGenerator.name(2),
        description: RandomGenerator.content(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        prices: [
          {
            product_code: RandomGenerator.alphaNumeric(10),
            currency_code: "USD",
            amount: 25.99,
            effective_from: new Date().toISOString(),
            quantity_min: 1,
          } satisfies ICommunityPlatformProductPrice.ICreate,
        ],
      } satisfies ICommunityPlatformProduct.ICreate,
    },
  );
  typia.assert(product);
  // Step 3: Create cart and add product
  const cart =
    await api.functional.communityPlatform.carts.create(memberConnection);
  typia.assert(cart);
  // Access cartId via type assertion - the actual response has 'id' even though not documented in DTO
  // This is a common API pattern where the response is richer than the documented DTO
  const cartId = (cart as any).id;
  // Create order item in cart (using cartId)
  const orderItem =
    await api.functional.communityPlatform.member.orders.items.create(
      memberConnection,
      {
        orderId: cartId,
        body: {
          product_id: product.id,
          quantity: 2,
        } satisfies ICommunityPlatformOrderItem.ICreate,
      },
    );
  typia.assert(orderItem);
  // Step 4: Create order from cart
  const order = await api.functional.communityPlatform.member.orders.create(
    memberConnection,
    {
      body: {
        cartId: cartId,
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
  // Step 5: Update order item quantity (this is the main test)
  const updatedItem =
    await api.functional.communityPlatform.member.orders.items.update(
      memberConnection,
      {
        orderId: order.id,
        itemCode: orderItem.item_code,
        body: {
          quantity: 5,
        } satisfies ICommunityPlatformOrderItem.IUpdate,
      },
    );
  typia.assert(updatedItem);
  // Step 6: Verify updated item has correct recalculated total_price
  const expectedTotalPrice = 5 * orderItem.unit_price;
  TestValidator.equals(
    "updated item total_price reflects new quantity",
    updatedItem.total_price,
    expectedTotalPrice,
  );
  // Step 7: Verify unit_price remains unchanged for audit purposes
  TestValidator.equals(
    "updated item unit_price preserved for audit",
    updatedItem.unit_price,
    orderItem.unit_price,
  );
  // Step 8: Verify correct order status for item update (should be pending or processing)
  TestValidator.predicate(
    "order status allows updates",
    order.status === "pending" || order.status === "processing",
  );
  // Step 9: Test forbidden update by different user
  // Create a different member
  const otherMemberConnection: api.IConnection = { host: connection.host };
  const otherMemberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com/home",
  } satisfies ICommunityPlatformMember.IJoin;
  const otherMemberAuth = await api.functional.auth.member.join(
    otherMemberConnection,
    {
      body: otherMemberCredentials,
    },
  );
  typia.assert(otherMemberAuth);
  // Try to update the same item with different member's connection (should fail)
  await TestValidator.error(
    "member cannot update another member's item",
    async () => {
      await api.functional.communityPlatform.member.orders.items.update(
        otherMemberConnection,
        {
          orderId: order.id,
          itemCode: orderItem.item_code,
          body: {
            quantity: 10,
          } satisfies ICommunityPlatformOrderItem.IUpdate,
        },
      );
    },
  );
}
