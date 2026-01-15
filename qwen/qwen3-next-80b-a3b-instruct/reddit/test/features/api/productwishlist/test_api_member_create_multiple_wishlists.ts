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
export async function test_api_member_create_multiple_wishlists(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and join as admin to create a category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create a product category using admin connection
  const category =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.content(),
          parent_id: null,
          status: "active",
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  typia.assert(category);
  // Step 3: Create member connection and join as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 4: Create a product using member connection
  const productCode = RandomGenerator.alphaNumeric(10);
  // Generate a UUID for the product category since the category object returned doesn't have an id field
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: productCode,
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: categoryId, // Use generated UUID
          prices: [
            {
              product_code: productCode, // Use the known productCode we generated
              currency_code: "USD",
              amount: typia.random<number & tags.Minimum<0>>(),
              effective_from: new Date().toISOString(),
            },
          ],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // Step 5: Create wishlists
  const wishlist1 =
    await generate_random_community_platform_member_productwishlists_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.content(),
        } satisfies ICommunityPlatformProductWishlist.ICreate,
      },
    );
  typia.assert(wishlist1);
  const wishlist2 =
    await generate_random_community_platform_member_productwishlists_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.content(),
        } satisfies ICommunityPlatformProductWishlist.ICreate,
      },
    );
  typia.assert(wishlist2);
  // Validate both wishlists have different names
  TestValidator.notEquals(
    "wishlist names should be different",
    wishlist1.name,
    wishlist2.name,
  );
  // Validate both wishlists have different descriptions if provided
  if (
    wishlist1.description !== null &&
    wishlist1.description !== undefined &&
    wishlist2.description !== null &&
    wishlist2.description !== undefined
  ) {
    TestValidator.notEquals(
      "wishlist descriptions should be different",
      wishlist1.description,
      wishlist2.description,
    );
  }
}
