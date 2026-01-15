import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProduct";
import type { ICommunityPlatformProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductCategory";
import type { ICommunityPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductImage";
import type { ICommunityPlatformProductPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductPrice";
import type { ICommunityPlatformProductWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductWishlist";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_category } from "../../../prepare/prepare_random_community_platform_product_category";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { prepare_random_community_platform_product_wishlist } from "../../../prepare/prepare_random_community_platform_product_wishlist";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { generate_random_community_platform_member_productwishlists_create } from "../../../generate/generate_random_community_platform_member_productwishlists_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_member_create_product_wishlist(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate admin
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: {},
  };
  const adminAuthResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  adminConnection.headers = adminConnection.headers ?? {};
  adminConnection.headers.Authorization = adminAuthResult.token.access;
  // Step 2: Create a product category using admin authentication
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
  // Use typia.assert to extract the id even though it's not in the defined type
  const categoryWithId = typia.assert<
    ICommunityPlatformProductCategory & {
      id: string;
    }
  >(category);
  // Step 3: Create member connection and authenticate member
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {},
  };
  const memberAuthResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  memberConnection.headers = memberConnection.headers ?? {};
  memberConnection.headers.Authorization = memberAuthResult.token.access;
  // Step 4: Create a product using member authentication, referencing the created category
  const randomName = RandomGenerator.name(3);
  const productBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: randomName,
    description: RandomGenerator.content(),
    category_id: categoryWithId.id,
    prices: [
      {
        product_code: RandomGenerator.alphaNumeric(8),
        currency_code: "USD",
        amount: typia.random<number & tags.Minimum<0>>(),
        effective_from: new Date().toISOString(),
        quantity_min: 1,
      },
    ],
  } satisfies ICommunityPlatformProduct.ICreate;
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: productBody,
      },
    );
  typia.assert(product);
  // Step 5: Create a product wishlist using member authentication
  const wishlistName = RandomGenerator.name(3);
  const wishlist =
    await generate_random_community_platform_member_productwishlists_create(
      memberConnection,
      {
        body: {
          name: wishlistName,
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityPlatformProductWishlist.ICreate,
      },
    );
  typia.assert(wishlist);
  // Step 6: Validate wishlist creation
  TestValidator.equals("wishlist name matches", wishlist.name, wishlistName);
  TestValidator.equals(
    "wishlist is private by default",
    wishlist.is_private,
    true,
  );
}
