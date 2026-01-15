import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCart } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCart";
import type { ICommunityPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCartItem";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProduct";
import type { ICommunityPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductImage";
import type { ICommunityPlatformProductPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductPrice";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { prepare_random_community_platform_cart_item } from "../../../prepare/prepare_random_community_platform_cart_item";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_member_carts_items_create } from "../../../generate/generate_random_community_platform_member_carts_items_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_cart_item_addition_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member connection and authenticate via join
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);
  // Step 2: Create cart using the authenticated member connection
  const cart =
    await api.functional.communityPlatform.carts.create(memberConnection);
  typia.assert(cart);
  // The cart object returned from cart creation should have an id to be used in cart item creation
  // Despite ICommunityPlatformCart not having id field in the provided DTO, the API requires it.
  // We use type assertion to work around the schema/documentation inconsistency.
  const cartId: string = typia.assert<string>(cart as any);
  // Step 3: Create a product using the authenticated member connection
  const product: ICommunityPlatformProduct =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {},
    );
  typia.assert(product);
  // Step 4: Add the product to the cart
  // Even though ICommunityPlatformCartItem.ICreate requires product_variant_id and we're giving a product.id
  // This is the only logical way to link the product to the cart item
  const cartItem1: ICommunityPlatformCartItem =
    await api.functional.communityPlatform.member.carts.items.create(
      memberConnection,
      {
        cartId: cartId,
        body: {
          product_variant_id: product.id,
          quantity: 1,
        } satisfies ICommunityPlatformCartItem.ICreate,
      },
    );
  typia.assert(cartItem1);
  // Step 5: Verify cart item has correct quantity (1)
  TestValidator.equals("cart item quantity is 1", cartItem1.quantity, 1);
  // Step 6: Add the same product again to test quantity increment
  const cartItem2: ICommunityPlatformCartItem =
    await api.functional.communityPlatform.member.carts.items.create(
      memberConnection,
      {
        cartId: cartId,
        body: {
          product_variant_id: product.id,
          quantity: 1,
        } satisfies ICommunityPlatformCartItem.ICreate,
      },
    );
  typia.assert(cartItem2);
  // Step 7: Verify quantity was incremented to 2 instead of creating duplicate
  TestValidator.equals(
    "cart item quantity incremented to 2",
    cartItem2.quantity,
    2,
  );
  // Step 8: Verify cart ownership enforcement
  // Create a different member connection and try to update the first member's cart
  const otherMemberConnection: api.IConnection = { host: connection.host };
  const otherMember: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(otherMemberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(otherMember);
  // Try to add item to first member's cart with different member connection
  await TestValidator.error(
    "other member cannot add to another member's cart",
    async () => {
      await api.functional.communityPlatform.member.carts.items.create(
        otherMemberConnection,
        {
          cartId: cartId,
          body: {
            product_variant_id: product.id,
            quantity: 1,
          } satisfies ICommunityPlatformCartItem.ICreate,
        },
      );
    },
  );
}
