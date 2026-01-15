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
import type { ICommunityPlatformProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductCategory";
import type { ICommunityPlatformProductSpecificationFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductSpecificationFilter";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformProduct";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_product_search_with_price_range(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  // Step 2: Search products with a broad price range first to get existing products
  const broadSearch: IPageICommunityPlatformProduct.ISummary =
    await api.functional.communityPlatform.products.index(memberConnection, {
      body: {
        price_min: 1,
        price_max: 10000,
      } satisfies ICommunityPlatformProduct.IRequest,
    });
  typia.assert(broadSearch);
  // Validate we have at least some products to test
  TestValidator.predicate(
    "at least one product exists in the system",
    broadSearch.data.length > 0,
  );
  // Step 3: Extract prices from existing products and determine test range
  // This ensures we use realistic data in the system
  const existingPrices = broadSearch.data.map((p) => p.price);
  const sortedPrices = [...existingPrices].sort((a, b) => a - b);
  // Choose valid min/max values from actual product prices
  // Public aesthetic choice: use first 30% as min and last 30% as max
  const startIndex = Math.floor(sortedPrices.length * 0.3);
  const endIndex = Math.floor(sortedPrices.length * 0.7);
  const priceMin = sortedPrices[Math.max(0, startIndex)];
  const priceMax = sortedPrices[Math.min(sortedPrices.length - 1, endIndex)];
  // Step 4: Perform search with determined price range
  const searchResult: IPageICommunityPlatformProduct.ISummary =
    await api.functional.communityPlatform.products.index(memberConnection, {
      body: {
        price_min: priceMin,
        price_max: priceMax,
      } satisfies ICommunityPlatformProduct.IRequest,
    });
  // Step 5: Validate response type and structure
  typia.assert(searchResult);
  // Step 6: Validate that all returned products are within price range
  const filteredProducts = searchResult.data;
  // Check that no product is outside the price range
  filteredProducts.forEach((product) => {
    TestValidator.predicate(
      `product ${product.id} price (${product.price}) is within range [${priceMin}, ${priceMax}]`,
      product.price >= priceMin && product.price <= priceMax,
    );
  });
  // Step 7: Verify that at least one product was returned
  TestValidator.predicate(
    "at least one product found in price range",
    filteredProducts.length > 0,
  );
  // Step 8: Validate that search results are a subset of the broader set
  TestValidator.predicate(
    "search result count is less than or equal to total products",
    filteredProducts.length <= broadSearch.data.length,
  );
  // Optional: Validate pagination information
  TestValidator.predicate(
    "pagination is correctly computed",
    searchResult.pagination.current >= 1 &&
      searchResult.pagination.limit > 0 &&
      searchResult.pagination.records >= searchResult.pagination.limit,
  );
}
