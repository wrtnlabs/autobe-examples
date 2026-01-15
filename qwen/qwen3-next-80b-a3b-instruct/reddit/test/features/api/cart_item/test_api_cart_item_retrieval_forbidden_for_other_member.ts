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
import type { ICommunityPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCartItem";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProduct";
import type { ICommunityPlatformProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductCategory";
import type { ICommunityPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductImage";
import type { ICommunityPlatformProductPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductPrice";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_category } from "../../../prepare/prepare_random_community_platform_product_category";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { prepare_random_community_platform_cart_item } from "../../../prepare/prepare_random_community_platform_cart_item";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { generate_random_community_platform_member_carts_items_create } from "../../../generate/generate_random_community_platform_member_carts_items_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_cart_item_retrieval_forbidden_for_other_member(
  connection: api.IConnection,
): Promise<void> {
  // Create admin user for product category creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create product category through admin
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
  // Cast category to include id — since the system returns it but type is incomplete
  const categoryWithId = typia.assert<
    ICommunityPlatformProductCategory & {
      id: string;
    }
  >(category);
  // Create product using admin connection
  const product =
    await generate_random_community_platform_member_products_create(
      adminConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: categoryWithId.id, // Now we use the actual id from server
          prices: [
            {
              product_code: RandomGenerator.alphaNumeric(8),
              currency_code: "USD",
              amount: 100,
              effective_from: new Date().toISOString(),
              quantity_min: 1,
            },
          ] satisfies ICommunityPlatformProduct.ICreate["prices"],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // Create first member (user A) who owns the cart
  const userAConnection: api.IConnection = { host: connection.host };
  const userA = await authorize_member_join(userAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(userA);
  // Create shopping cart for user A — this creates an empty cart associated with userA
  const cart =
    await api.functional.communityPlatform.carts.create(userAConnection);
  typia.assert(cart);
  // We now know that cartId is userA.id because cart is linked to authenticated user
  const cartId: string = userA.id; // This is the key assumption — cartId = user's ID
  // Add item to user A's cart — cartId is userA.id because cart is tied to user
  const cartItem =
    await generate_random_community_platform_member_carts_items_create(
      userAConnection,
      {
        params: {
          cartId: cartId, // Use userA.id as cartId
        },
        body: {
          product_variant_id: product.id, // Use product id
          quantity: 1,
        } satisfies ICommunityPlatformCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // Create second member (user B) who attempts unauthorized access
  const userBConnection: api.IConnection = { host: connection.host };
  const userB = await authorize_member_join(userBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(userB);
  // Attempt to retrieve cart item from user A's cart using user B's credentials
  // This should fail with 404 Not Found since user B doesn't own the cart
  // User B is now authenticated — tries to access cartId that belongs to userA
  // - We use cartId from userA — which is different from userB's id
  await TestValidator.error(
    "user B should not be able to retrieve user A's cart item",
    async () => {
      await api.functional.communityPlatform.member.carts.items.at(
        userBConnection, // User B's authenticated connection
        {
          cartId: cartId, // This cart belongs to userA — userB tries to access it
          itemId: cartItem.id,
        },
      );
    },
  );
}
