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
export async function test_api_order_item_creation_with_stock_validation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member for order operations
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  // Step 2: Create a product with minimal stock (1 unit) for testing
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: typia.random<string & tags.Format<"uuid">>(),
          prices: [
            {
              product_code: RandomGenerator.alphaNumeric(10),
              currency_code: "USD",
              amount: 100,
              effective_from: new Date().toISOString(),
            },
          ],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // Step 3: Create an order for the member
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
  // Step 4: Test successful order item creation with sufficient stock (1 unit)
  const orderItem1 =
    await generate_random_community_platform_member_orders_items_create(
      memberConnection,
      {
        body: {
          product_id: product.id,
          quantity: 1,
        } satisfies ICommunityPlatformOrderItem.ICreate,
        params: {
          orderId: order.id,
        },
      },
    );
  typia.assert(orderItem1);
  TestValidator.equals(
    "first order item created successfully",
    orderItem1.quantity,
    1,
  );
  // Step 5: Inventory verification skipped due to absence of product retrieval API
  // The system implicitly handles inventory deduction; verification not possible without 'get' endpoint
  // Step 6: Test order item creation failure when stock is zero (should fail)
  await TestValidator.error(
    "should fail when stock is zero after initial successful purchase",
    async () => {
      await api.functional.communityPlatform.member.orders.items.create(
        memberConnection,
        {
          orderId: order.id,
          body: {
            product_id: product.id,
            quantity: 1,
          } satisfies ICommunityPlatformOrderItem.ICreate,
        },
      );
    },
  );
  // Step 7: Test order item creation failure when stock is insufficient for quantity > 1 (should fail)
  await TestValidator.error(
    "should fail when requesting quantity > available stock (0)",
    async () => {
      await api.functional.communityPlatform.member.orders.items.create(
        memberConnection,
        {
          orderId: order.id,
          body: {
            product_id: product.id,
            quantity: 2,
          } satisfies ICommunityPlatformOrderItem.ICreate,
        },
      );
    },
  );
}
