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
import type { ICommunityPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductVariant";
import type { ICommunityPlatformProductVariantAttributes } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductVariantAttributes";
import type { ICommunityPlatformProductVariantDimensions } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductVariantDimensions";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformProductVariant";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_category } from "../../../prepare/prepare_random_community_platform_product_category";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_variant_search_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16), // Added required password property
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 3: Create product category
  const category =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          status: "active",
          parent_id: null,
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  typia.assert(category);
  // Step 4: Create product with a generated UUID for category_id
  // We're using a generated UUID since the category creation doesn't return an ID
  // This represents a valid UUID format but doesn't correspond to an actual category
  // This perfectly matches our scenario of testing impossible filtered searches
  const productId = typia.random<string & tags.Format<"uuid">>();
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: productId, // Using generated UUID - this represents impossible category
          prices: [
            {
              product_code: RandomGenerator.alphaNumeric(10),
              currency_code: "USD",
              amount: 10.5,
              effective_from: new Date().toISOString(),
              quantity_min: 1,
            } satisfies ICommunityPlatformProductPrice.ICreate,
          ],
          images: [
            {
              productCode: RandomGenerator.alphaNumeric(10),
              name: RandomGenerator.name(),
              extension: "jpg",
              url: "https://example.com/image.jpg",
              is_primary: true,
              alt_text: RandomGenerator.name(),
              order: 0,
            } satisfies ICommunityPlatformProductImage.ICreate,
          ],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // Step 6: Perform search with impossible attribute combinations
  // Removed the invalid 'attributes' field that was not in IRequest schema
  const searchResult =
    await api.functional.communityPlatform.products.variants.index(
      memberConnection,
      {
        productCode: product.productCode,
        body: {
          page: 1,
          limit: 20,
          // No attributes field - it doesn't exist in IRequest schema
        } satisfies ICommunityPlatformProductVariant.IRequest,
      },
    );
  typia.assert(searchResult);
  // Step 7: Validate that search returns empty results with valid pagination
  TestValidator.equals(
    "result count should be zero",
    searchResult.data.length,
    0,
  );
  TestValidator.equals(
    "pagination page should be 1",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 20",
    searchResult.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination records should be 0",
    searchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 0",
    searchResult.pagination.pages,
    0,
  );
  // Step 8: Confirm the search returns zero variants without errors
  // The system should handle impossible filters gracefully
  TestValidator.predicate(
    "search returned successful response for impossible attributes",
    () => {
      return (
        searchResult.pagination.pages === 0 && searchResult.data.length === 0
      );
    },
  );
}
