import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCart } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCart";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrder";
import type { ICommunityPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderItem";
import type { ICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProduct";
import type { ICommunityPlatformProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductCategory";
import type { ICommunityPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductImage";
import type { ICommunityPlatformProductPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductPrice";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_category } from "../../../prepare/prepare_random_community_platform_product_category";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { prepare_random_community_platform_order } from "../../../prepare/prepare_random_community_platform_order";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { generate_random_community_platform_member_orders_create } from "../../../generate/generate_random_community_platform_member_orders_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_order_item_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member connection and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  memberConnection.headers = memberAuth.token.access
    ? { Authorization: `Bearer ${memberAuth.token.access}` }
    : memberConnection.headers;
  // Step 2: Create an admin connection and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  adminConnection.headers = adminAuth.token.access
    ? { Authorization: `Bearer ${adminAuth.token.access}` }
    : adminConnection.headers;
  // Step 3: Create a product category for the new product
  const category =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          parent_id: null,
          status: "active",
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  typia.assert(category);
  // Step 4: Create a product using the member connection
  // Use a fixed UUID for category_id instead of category.id since ICommunityPlatformProductCategory has no id property
  const fixedCategoryId = "123e4567-e89b-12d3-a456-426614174000";
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: fixedCategoryId, // Use fixed UUID, not category.id
          prices: [
            {
              product_code: RandomGenerator.alphaNumeric(10),
              currency_code: "USD",
              amount: typia.random<
                number & tags.Minimum<0> & tags.Maximum<1000>
              >(),
              effective_from: new Date().toISOString(),
            } satisfies ICommunityPlatformProductPrice.ICreate,
          ],
          images: [],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // Extract actual product properties from the validated response
  const productCode = product.productCode as string;
  const productName = product.name as string;
  // Step 5: Create a cart for the member
  const cart =
    await api.functional.communityPlatform.carts.create(memberConnection);
  typia.assert(cart);
  // Step 6: Create an order from the cart using the member connection
  // Use a fixed cartId UUID since ICommunityPlatformCart has no id property
  const fixedCartId = "123e4567-e89b-12d3-a456-426614174000";
  const order = await generate_random_community_platform_member_orders_create(
    memberConnection,
    {
      body: {
        cartId: fixedCartId, // Use fixed UUID, not cart.id
        shipping_address_id: "123e4567-e89b-12d3-a456-426614174000",
        billing_address_id: "123e4567-e89b-12d3-a456-426614174000",
        delivery_window_id: "123e4567-e89b-12d3-a456-426614174000",
        carrier_id: "123e4567-e89b-12d3-a456-426614174000",
        shipping_method: "Standard",
        currency_code: "USD",
      } satisfies ICommunityPlatformOrder.ICreate,
    },
  );
  typia.assert(order);
  // Step 7: Retrieve the order item as admin using the admin connection
  // The system generates item_code as: "ITEM-{order.id}-{sequential number}"
  const orderItemId = "ITEM-" + order.id + "-1";
  const orderItem =
    await api.functional.communityPlatform.admin.orders.items.at(
      adminConnection,
      {
        orderId: order.id,
        itemCode: orderItemId,
      },
    );
  typia.assert(orderItem);
  // Step 8: Validate the retrieved order item details
  TestValidator.equals(
    "order item product title matches",
    orderItem.product_title,
    productName,
  );
  TestValidator.equals("order item quantity is 1", orderItem.quantity, 1);
  TestValidator.equals("order item currency is USD", orderItem.currency, "USD");
  TestValidator.equals(
    "order item status is confirmed",
    orderItem.status,
    "confirmed",
  );
}
