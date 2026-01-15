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
export async function test_api_cart_item_update_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate for category creation
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: ICommunityPlatformAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Create product category as admin
  const category: ICommunityPlatformProductCategory =
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
  // Step 3: Create member connection and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);
  // Step 4: Create product as member (using member connection, not admin)
  const productCode = RandomGenerator.alphaNumeric(10);
  const product: ICommunityPlatformProduct =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: productCode,
          title: RandomGenerator.name(3),
          description: RandomGenerator.content(),
          category_id: (typia.assert<{ id: string }>(category)).id,
          prices: [
            {
              product_code: productCode, // Fixed: Using productCode variable directly
              currency_code: "KRW",
              amount: 10000,
              effective_from: new Date().toISOString(),
            } satisfies ICommunityPlatformProductPrice.ICreate,
          ],
          images: [],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // Step 5: Create cart as member
  const cart: ICommunityPlatformCart =
    await api.functional.communityPlatform.carts.create(memberConnection);
  typia.assert(cart);
  // Step 6: Add product to cart as member
  const cartItem: ICommunityPlatformCartItem =
    await generate_random_community_platform_member_carts_items_create(
      memberConnection,
      {
        params: {
          cartId: (typia.assert<{ id: string }>(cart)).id,
        },
        body: {
          product_variant_id: product.id,
          quantity: 1,
        } satisfies ICommunityPlatformCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // Step 7: Update cart item quantity as member
  const updatedCartItem: ICommunityPlatformCartItem =
    await api.functional.communityPlatform.member.carts.items.update(
      memberConnection,
      {
        cartId: (typia.assert<{ id: string }>(cart)).id,
        itemId: (typia.assert<{ id: string }>(cartItem)).id,
        body: {
          quantity: 5,
        } satisfies ICommunityPlatformCartItem.IUpdate,
      },
    );
  typia.assert(updatedCartItem);
  // Step 8: Validate quantity was updated to 5
  TestValidator.equals(
    "cart item quantity should be updated to 5",
    updatedCartItem.quantity,
    5,
  );
  // Step 9: Test unauthorized update - admin trying to update member's cart item
  // Admin connection already authenticated above, trying to update member's cart item
  await TestValidator.error(
    "Admin should not be able to update member's cart item",
    async () => {
      await api.functional.communityPlatform.member.carts.items.update(
        adminConnection, // Admin connection trying to update member's cart item
        {
          cartId: (typia.assert<{ id: string }>(cart)).id,
          itemId: (typia.assert<{ id: string }>(cartItem)).id,
          body: {
            quantity: 10,
          } satisfies ICommunityPlatformCartItem.IUpdate,
        },
      );
    },
  );
  // Note: Cannot validate cart total because ICommunityPlatformCart has no total property
  // and no API endpoint exists to retrieve cart details after creation
  // The system recalculates the cart total internally, and the cart item quantity update is verified directly
}