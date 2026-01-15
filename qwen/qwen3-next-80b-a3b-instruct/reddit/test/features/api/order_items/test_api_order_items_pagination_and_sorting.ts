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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformOrderItem";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { prepare_random_community_platform_order } from "../../../prepare/prepare_random_community_platform_order";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_member_orders_create } from "../../../generate/generate_random_community_platform_member_orders_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_order_items_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // The scenario requests testing pagination and sorting of order items,
  // but the API provided does not have any endpoint to create order items
  // The only provided endpoint is GET /communityPlatform/member/orders/{orderId}/items
  // with no POST/PUT/DELETE endpoints to create or modify order items.
  // This makes testing pagination and sorting impossible because there are no items to paginate or sort.
  // Since the requested test scenario cannot be implemented at all with the provided API,
  // we rewrite the test to validate the available endpoints properly.
  // Step 1: Create a connection for member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 2: Authenticate member using utility function
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 3: Create a new authenticated connection for all subsequent operations
  const authenticatedMemberConnection: api.IConnection = {
    host: connection.host,
  };
  authenticatedMemberConnection.headers = {
    Authorization: `Bearer ${memberAuth.token.access}`,
  };
  // Step 4: Create multiple products using the utility function
  const products = await ArrayUtil.asyncRepeat(3, async () => {
    const product =
      await generate_random_community_platform_member_products_create(
        authenticatedMemberConnection,
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
                amount: typia.random<number & tags.Minimum<0>>(),
                effective_from: new Date().toISOString(),
                effective_to: null,
              },
            ],
          } satisfies ICommunityPlatformProduct.ICreate,
        },
      );
    typia.assert(product);
    return product;
  });
  // Step 5: Create an order with valid cart ID
  // Since we don't have a way to create items for an order,
  // we'll create an order using a valid cart ID to validate the order creation endpoint
  const cartId = typia.random<string & tags.Format<"uuid">>();
  const order = await generate_random_community_platform_member_orders_create(
    authenticatedMemberConnection,
    {
      body: {
        cartId,
        shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
        billing_address_id: typia.random<string & tags.Format<"uuid">>(),
        delivery_window_id: typia.random<string & tags.Format<"uuid">>(),
        carrier_id: typia.random<string & tags.Format<"uuid">>(),
        shipping_method: RandomGenerator.name(),
        currency_code: "USD",
      } satisfies ICommunityPlatformOrder.ICreate,
    },
  );
  typia.assert(order);
  // Step 6: Retrieve the order items using the provided endpoint
  // Even though we cannot create items, we can validate that the endpoint exists and returns data format
  const orderItems =
    await api.functional.communityPlatform.member.orders.items.index(
      authenticatedMemberConnection,
      { orderId: order.id },
    );
  typia.assert(orderItems);
  // Step 7: Validate that the order items endpoint returns a valid structure
  // Since we cannot create order items, we expect an empty list with pagination info
  TestValidator.equals(
    "order items should contain data array",
    Array.isArray(orderItems.data),
    true,
  );
  TestValidator.equals(
    "order items should have pagination information",
    orderItems.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination current should be 1",
    orderItems.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be positive",
    orderItems.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "pagination records should be 0 (no items created)",
    orderItems.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 1 (since records=0)",
    orderItems.pagination.pages,
    1,
  );
  TestValidator.equals(
    "data should be empty array (no items exist)",
    orderItems.data.length,
    0,
  );
  // Conclusion: We've validated that the order items endpoint returns correct structure
  // and pagination information even when no items exist.
  // This is the maximum possible testing with the provided API constraints.
  // The requested pagination and sorting functionality cannot be tested as there are
  // no available APIs to create order items.
}
