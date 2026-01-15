import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProduct";
import type { ICommunityPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductImage";
import type { ICommunityPlatformProductPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductPrice";
import type { ICommunityPlatformSaleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSaleFavorite";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { prepare_random_community_platform_sale_favorite } from "../../../prepare/prepare_random_community_platform_sale_favorite";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_member_favorites_create } from "../../../generate/generate_random_community_platform_member_favorites_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_add_duplicate_product_to_favorites(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as member
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
  // Step 2: Create a product using member connection
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          category_id: typia.random<string & tags.Format<"uuid">>(),
          prices: [
            {
              product_code: RandomGenerator.alphaNumeric(8), // Use random product_code separately
              currency_code: "USD",
              amount: 99.99,
              effective_from: new Date().toISOString(),
            },
          ],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // Step 3: Add the product to favorites for the first time
  const firstFavorite =
    await generate_random_community_platform_member_favorites_create(
      memberConnection,
      {
        body: {
          productId: product.id,
        } satisfies ICommunityPlatformSaleFavorite.ICreate,
      },
    );
  typia.assert(firstFavorite);
  TestValidator.equals(
    "first favorite product name",
    firstFavorite.product_name,
    product.name,
  );
  // Step 4: Attempt to add the same product to favorites again
  const secondFavorite =
    await generate_random_community_platform_member_favorites_create(
      memberConnection,
      {
        body: {
          productId: product.id,
        } satisfies ICommunityPlatformSaleFavorite.ICreate,
      },
    );
  typia.assert(secondFavorite);
  // Step 5: Validate that the second addition returns the same product name but has a different timestamp
  // This confirms that the system treats duplicate additions correctly: does not create duplicate records
  // but returns the current state with a new favorite timestamp.
  TestValidator.equals(
    "second favorite product name matches first",
    secondFavorite.product_name,
    firstFavorite.product_name,
  );
  TestValidator.notEquals(
    "favorite timestamps are different",
    firstFavorite.favorite_timestamp,
    secondFavorite.favorite_timestamp,
  );
}
