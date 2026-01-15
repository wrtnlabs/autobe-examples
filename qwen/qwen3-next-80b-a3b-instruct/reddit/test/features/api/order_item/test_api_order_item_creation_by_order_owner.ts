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
export async function test_api_order_item_creation_by_order_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member1 to create order
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Response = await api.functional.auth.member.join(
    member1Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    },
  );
  typia.assert(member1Response);
  // Step 2: Create a category ID (only need UUID for reference)
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Create a product for member1
  const productCode = RandomGenerator.alphaNumeric(10);
  const product: ICommunityPlatformProduct =
    await api.functional.communityPlatform.member.products.create(
      member1Connection,
      {
        body: {
          code: productCode,
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: categoryId,
          prices: [
            {
              product_code: productCode, // Match product.code
              currency_code: "USD",
              amount: typia.random<number & tags.Minimum<0>>(),
              effective_from: new Date().toISOString(),
              quantity_min: 1,
            },
          ],
          images: [],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // Step 4: Create cart (as placeholder since we don't have cart creation API)
  const cartId = typia.random<string & tags.Format<"uuid">>();
  // Step 5: Create an order for member1
  const order: ICommunityPlatformOrder =
    await api.functional.communityPlatform.member.orders.create(
      member1Connection,
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
  // Step 6: member1 adds item to their own order
  const orderItem: ICommunityPlatformOrderItem =
    await api.functional.communityPlatform.member.orders.items.create(
      member1Connection,
      {
        orderId: order.id,
        body: {
          product_id: product.id,
          quantity: 1,
        } satisfies ICommunityPlatformOrderItem.ICreate,
      },
    );
  typia.assert(orderItem);
  TestValidator.equals(
    "item belongs to correct order",
    orderItem.order_id,
    order.id,
  );
  // Step 7: Inventory deduction is a business rule handled by server
  // We cannot validate it due to lack of product read endpoint in SDK
  // So removal of validation - focus on ownership test
  // Step 8: Authenticate member2 (different member)
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Response = await api.functional.auth.member.join(
    member2Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    },
  );
  typia.assert(member2Response);
  // Step 9: Member2 attempts to add item to member1's order - should fail
  await TestValidator.error(
    "member2 cannot access member1's order",
    async () => {
      await api.functional.communityPlatform.member.orders.items.create(
        member2Connection,
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
}
