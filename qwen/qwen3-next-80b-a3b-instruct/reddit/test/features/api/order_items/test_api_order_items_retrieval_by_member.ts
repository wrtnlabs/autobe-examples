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
export async function test_api_order_items_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCert: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(memberCert);
  // Step 2: Create a product
  const product: ICommunityPlatformProduct =
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
              amount: 29.99,
              effective_from: new Date().toISOString(),
              quantity_min: 1,
            } satisfies ICommunityPlatformProductPrice.ICreate,
          ],
          images: [],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // Step 3: Create order with a generated cartId (bypassing cart creation)
  // Since cart creation API returns a summary with no ID, we generate a UUID as cartId
  const cartId: string = typia.random<string & tags.Format<"uuid">>();
  const order: ICommunityPlatformOrder =
    await generate_random_community_platform_member_orders_create(
      memberConnection,
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
  // Step 4: Retrieve order items
  const response: IPageICommunityPlatformOrderItem.ISummary =
    await api.functional.communityPlatform.member.orders.items.index(
      memberConnection,
      {
        orderId: order.id,
      },
    );
  typia.assert(response);
  // Step 5: Validate the response contains correct pagination and order items
  TestValidator.equals(
    "pagination current page is 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is set",
    response.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "pagination records is correct",
    response.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages is correct",
    response.pagination.pages >= 0,
    true,
  );
  TestValidator.predicate("data array is not empty", response.data.length > 0);
  // Validate that all order items belong to the correct order and have correct structure
  for (const item of response.data) {
    TestValidator.equals(
      "item order_id matches requested order",
      item.order_id,
      order.id,
    );
    TestValidator.predicate(
      "item id is valid uuid",
      typeof item.id === "string" && /^[0-9a-f-]{36}$/i.test(item.id),
    );
    TestValidator.predicate(
      "item product_id is valid uuid",
      typeof item.product_id === "string" &&
        /^[0-9a-f-]{36}$/i.test(item.product_id),
    );
    TestValidator.equals(
      "item quantity is at least 1",
      item.quantity >= 1,
      true,
    );
    TestValidator.equals(
      "item unit_price is non-negative",
      item.unit_price >= 0,
      true,
    );
    TestValidator.equals(
      "item total_price is non-negative",
      item.total_price >= 0,
      true,
    );
    TestValidator.predicate(
      "item created_at is valid date-time",
      typeof item.created_at === "string",
    );
  }
}
