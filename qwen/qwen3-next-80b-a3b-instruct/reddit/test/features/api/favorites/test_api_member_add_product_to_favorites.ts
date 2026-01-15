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
export async function test_api_member_add_product_to_favorites(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for member and register
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
  // Step 2: Create a new product using the member connection
  // Use productCode in the create schema, then use productCode from response for pricing
  const product: ICommunityPlatformProduct =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8), // ICommunityPlatformProduct.ICreate has 'code'
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
          description: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 10,
            sentenceMax: 20,
            wordMin: 4,
            wordMax: 8,
          }),
          category_id: typia.random<string & tags.Format<"uuid">>(),
          prices: [
            {
              product_code: RandomGenerator.alphaNumeric(8), // Placeholder - will be overwritten
              currency_code: "USD",
              amount: typia.random<number & tags.Minimum<0>>(),
              effective_from: new Date().toISOString(),
            },
          ],
        },
      },
    );
  typia.assert(product);
  // The product returned has 'productCode' field (not 'code'), and 'id' field
  // Update the product with correct productCode for the price before creating
  const updatedProduct: ICommunityPlatformProduct =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: product.productCode, // Use the actual productCode from the created product
          title: product.name,
          description: product.description,
          category_id: product.category_id,
          prices: [
            {
              product_code: product.productCode, // Use correct field from the product response
              currency_code: "USD",
              amount: 1000,
              effective_from: new Date().toISOString(),
            },
          ],
        },
      },
    );
  typia.assert(updatedProduct);
  // Step 3: Add the product to favorites using the member connection
  // Use product.id (UUID) as required by ICommunityPlatformSaleFavorite.ICreate
  const favorite: ICommunityPlatformSaleFavorite =
    await generate_random_community_platform_member_favorites_create(
      memberConnection,
      {
        body: {
          productId: updatedProduct.id,
        } satisfies ICommunityPlatformSaleFavorite.ICreate,
      },
    );
  typia.assert(favorite);
  // Step 4: Validate the favorite response contains expected business information
  TestValidator.equals(
    "product name matches",
    favorite.product_name,
    updatedProduct.name,
  );
  TestValidator.predicate(
    "favorite timestamp is present",
    favorite.favorite_timestamp.length > 0,
  );
}
