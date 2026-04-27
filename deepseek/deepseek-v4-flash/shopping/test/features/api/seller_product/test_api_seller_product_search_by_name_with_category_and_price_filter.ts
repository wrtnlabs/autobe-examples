import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that a seller can search for products by name with category and price range filters applied.
 *
 * Validates the seller product search endpoint with combined filtering by product name keyword,
 * category identifier, and price boundaries. Ensures the response pagination structure is correct
 * and that any returned products have the expected summary fields and visibility status.
 *
 * 1. Register a seller account with shop profile and obtain JWT token.
 * 2. Call the seller product search endpoint with search, categoryId, minPrice, maxPrice, sort, limit, and page parameters.
 * 3. Validate the paginated response structure and business invariants on returned products.
 */
export async function test_api_seller_product_search_by_name_with_category_and_price_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a seller and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 2. Search products by name with category and price range filters
  const searchResult = await api.functional.eCommerceMall.seller.products.index(
    sellerConnection,
    {
      body: {
        search: RandomGenerator.alphabets(3),
        categoryId: typia.random<string & tags.Format<"uuid">>(),
        minPrice: 50.0,
        maxPrice: 2000.0,
        sort: "newest",
        limit: 20,
        page: 1,
      } satisfies IECommerceMallProduct.IRequest,
    },
  );
  typia.assert(searchResult);
  // 3. Validate pagination structure
  TestValidator.equals("current page", searchResult.pagination.current, 1);
  TestValidator.predicate(
    "limit within bounds",
    searchResult.pagination.limit <= 20,
  );
  TestValidator.predicate(
    "records is non-negative",
    searchResult.pagination.records >= 0,
  );
  // 4. Validate each returned product's summary fields and visibility
  for (const product of searchResult.data) {
    TestValidator.equals(
      "product visibility is visible",
      product.visibility,
      "visible",
    );
    TestValidator.predicate(
      "product has valid id",
      typeof product.id === "string",
    );
    TestValidator.predicate(
      "product has name",
      typeof product.name === "string",
    );
    TestValidator.predicate(
      "product has base_price",
      typeof product.base_price === "number",
    );
    TestValidator.predicate(
      "product has seller with shop_name",
      typeof product.seller.profile.shop_name === "string",
    );
    TestValidator.predicate(
      "product has review_count",
      typeof product.review_count === "number",
    );
  }
}
