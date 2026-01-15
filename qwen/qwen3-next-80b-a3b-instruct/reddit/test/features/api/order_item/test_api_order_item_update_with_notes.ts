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
export async function test_api_order_item_update_with_notes(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: `https://example.com/join?source=${RandomGenerator.alphaNumeric(6)}`,
    referrer: `https://example.com/home?ref=${RandomGenerator.alphaNumeric(6)}`,
  } satisfies ICommunityPlatformMember.IJoin;
  const memberAuth = await authorize_member_join(memberConnection, {
    body: memberData,
  });
  typia.assert(memberAuth);
  // Step 2: Create a product
  const productCode = RandomGenerator.alphaNumeric(12);
  const productData = {
    code: productCode,
    title: RandomGenerator.name(),
    description: RandomGenerator.content(),
    category_id: typia.random<string & tags.Format<"uuid">>(),
    prices: [
      {
        product_code: productCode,
        currency_code: "USD",
        amount: typia.random<number & tags.Minimum<0>>(),
        effective_from: new Date().toISOString(),
      },
    ],
  } satisfies ICommunityPlatformProduct.ICreate;
  const product = await api.functional.communityPlatform.member.products.create(
    memberConnection,
    {
      body: productData,
    },
  );
  typia.assert(product);
  // Step 3: Create order (without cart, since cart response has no ID)
  // Create a valid cartId as random UUID to satisfy the order creation schema
  const cartId = typia.random<string & tags.Format<"uuid">>();
  const orderData = {
    cartId,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    delivery_window_id: typia.random<string & tags.Format<"uuid">>(),
    carrier_id: typia.random<string & tags.Format<"uuid">>(),
    shipping_method: RandomGenerator.name(),
    currency_code: "USD",
  } satisfies ICommunityPlatformOrder.ICreate;
  const order = await api.functional.communityPlatform.member.orders.create(
    memberConnection,
    {
      body: orderData,
    },
  );
  typia.assert(order);
  // Step 4: Create order item
  const orderItemData = {
    product_id: product.id,
    quantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  } satisfies ICommunityPlatformOrderItem.ICreate;
  const orderItem =
    await api.functional.communityPlatform.member.orders.items.create(
      memberConnection,
      {
        orderId: order.id,
        body: orderItemData,
      },
    );
  typia.assert(orderItem);
  // Step 5: Update order item with notes
  const updateNotes = RandomGenerator.paragraph({ sentences: 3 });
  const updatedItem =
    await api.functional.communityPlatform.member.orders.items.update(
      memberConnection,
      {
        orderId: order.id,
        itemCode: orderItem.item_code,
        body: {
          notes: updateNotes,
        } satisfies ICommunityPlatformOrderItem.IUpdate,
      },
    );
  typia.assert(updatedItem);
  // Step 6: Validate update
  TestValidator.equals(
    "notes updated correctly",
    updatedItem.notes,
    updateNotes,
  );
  TestValidator.equals(
    "price unchanged",
    updatedItem.unit_price,
    orderItem.unit_price,
  );
  TestValidator.equals(
    "quantity unchanged",
    updatedItem.quantity,
    orderItem.quantity,
  );
  TestValidator.equals(
    "currency unchanged",
    updatedItem.currency,
    orderItem.currency,
  );
  TestValidator.equals(
    "product id unchanged",
    updatedItem.product_id,
    orderItem.product_id,
  );
  TestValidator.predicate("status unchanged", () => {
    return updatedItem.status === orderItem.status;
  });
}
