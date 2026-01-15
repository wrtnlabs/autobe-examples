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
import type { ICommunityPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipment";
import type { ICommunityPlatformShipmentAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentAddress";
import type { ICommunityPlatformShipmentDimensions } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentDimensions";
import type { ICommunityPlatformShipmentPackage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentPackage";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { prepare_random_community_platform_shipment } from "../../../prepare/prepare_random_community_platform_shipment";
import { prepare_random_community_platform_order } from "../../../prepare/prepare_random_community_platform_order";
import { prepare_random_community_platform_order_item } from "../../../prepare/prepare_random_community_platform_order_item";
import { prepare_random_community_platform_shipment_package } from "../../../prepare/prepare_random_community_platform_shipment_package";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_member_orders_create } from "../../../generate/generate_random_community_platform_member_orders_create";
import { generate_random_community_platform_member_orders_items_create } from "../../../generate/generate_random_community_platform_member_orders_items_create";
import { generate_random_community_platform_member_orders_shipments_create } from "../../../generate/generate_random_community_platform_member_orders_shipments_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_order_item_update_blocked_by_order_status(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authorize member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: `https://example.com/join`,
        referrer: `https://example.com/home`,
      } satisfies ICommunityPlatformMember.IJoin,
    });
  // Step 2: Create a product as member
  const productCode = RandomGenerator.alphaNumeric(10);
  const product: ICommunityPlatformProduct =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: productCode,
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: typia.random<string & tags.Format<"uuid">>(),
          prices: [
            {
              product_code: productCode,
              currency_code: "USD",
              amount: 100,
              effective_from: new Date().toISOString(),
            },
          ],
        },
      },
    );
  // Step 3: Create cart as member
  const cart: ICommunityPlatformCart =
    await api.functional.communityPlatform.carts.create(memberConnection);
  typia.assert(cart);
  // Step 4: Create order from cart
  const order: ICommunityPlatformOrder =
    await generate_random_community_platform_member_orders_create(
      memberConnection,
      {
        body: {
          cartId: (cart as any).cartId ?? (cart as any).id, // Use the correct property, sanitize type
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
  // Step 5: Create order item
  const orderItem: ICommunityPlatformOrderItem =
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
  typia.assert(orderItem);
  // Step 6: Trigger shipment to change order status to 'shipped'
  const shipment: ICommunityPlatformShipment =
    await generate_random_community_platform_member_orders_shipments_create(
      memberConnection,
      {
        body: {
          notes: "Standard shipping",
          packages: [
            {
              shipment_id: typia.random<string & tags.Format<"uuid">>(), // Required by schema (despite being system-generated)
              product_id: product.id,
              quantity: 1,
              weight_grams: 500,
              tracking_number: RandomGenerator.alphaNumeric(16),
              carrier_id: typia.random<string & tags.Format<"uuid">>(),
              insurance_value_usd: 0,
              special_instructions: "Handle with care",
            },
          ],
          shipment_type: "standard",
        } satisfies ICommunityPlatformShipment.ICreate,
        params: {
          orderId: order.id,
        },
      },
    );
  typia.assert(shipment);
  // Step 7: Attempt to update order item after shipment - should be blocked
  await TestValidator.error(
    "item update should be blocked when order status is shipped",
    async () => {
      await api.functional.communityPlatform.member.orders.items.update(
        memberConnection,
        {
          orderId: order.id,
          itemCode: orderItem.item_code,
          body: {
            quantity: 2, // Update quantity
          } satisfies ICommunityPlatformOrderItem.IUpdate,
        },
      );
    },
  );
}