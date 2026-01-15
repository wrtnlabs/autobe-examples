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
export async function test_api_member_create_wishlist_with_description(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Create a product category as admin
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
  // Step 3: Create a product as admin - must be publicly accessible
  const productCode = RandomGenerator.alphaNumeric(8);
  const product =
    await generate_random_community_platform_member_products_create(
      adminConnection,
      {
        body: {
          code: productCode,
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: (category as any).id satisfies string & tags.Format<"uuid"> as string & tags.Format<"uuid">,
          prices: [
            {
              product_code: productCode,
              currency_code: "USD",
              amount: typia.random<number & tags.Minimum<0>>(),
              effective_from: new Date().toISOString(),
            },
          ],
          // Removed is_public as not in ICommunityPlatformProduct.ICreate schema
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  TestValidator.equals("product should be public", (product as any).is_public satisfies boolean as boolean, true);
  // Step 4: Create and authenticate member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  // Step 5: Create a wishlist with description as member
  const description = RandomGenerator.paragraph();
  const wishlist =
    await generate_random_community_platform_member_productwishlists_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: description satisfies string as string,
        } satisfies ICommunityPlatformProductWishlist.ICreate,
      },
    );
  typia.assert(wishlist);
  // Step 6: Validate that the description is preserved in the response
  TestValidator.equals(
    "wishlist description matches",
    wishlist.description satisfies string | undefined as string | undefined,
    description satisfies string | undefined as string | undefined,
  );
  // Step 7: Create a wishlist with null description - TYPE ERROR: Use undefined, not null, since type is string | undefined
  const wishlistWithNullDescription =
    await generate_random_community_platform_member_productwishlists_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: undefined as string | undefined,
        } satisfies ICommunityPlatformProductWishlist.ICreate,
      },
    );
  typia.assert(wishlistWithNullDescription);
  // Step 8: Validate that undefined description is handled correctly
  TestValidator.equals(
    "undefined description is preserved",
    wishlistWithNullDescription.description satisfies string | undefined as string | undefined,
    undefined,
  );
}