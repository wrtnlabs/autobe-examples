import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";

export async function test_api_product_search_case_insensitive(
  connection: api.IConnection,
) {
  // Search for products using lowercase 'phone' to test case-insensitive matching
  // The test assumes the system contains products with exact titles: 'phone', 'Phone', 'PHONE', 'pHoNe'
  const searchResult = await api.functional.shoppingMall.products.index(
    connection,
    { body: "phone" },
  );
  typia.assert(searchResult);

  // Verify search returned at least one result
  TestValidator.predicate(
    "search returns results",
    searchResult.data.length > 0,
  );

  // Verify that the search results match case-insensitive pattern
  const caseInsensitiveMatch = searchResult.data.some((p) =>
    /phone/i.test(p.title),
  );
  TestValidator.predicate(
    "search matches case-insensitive 'phone'",
    caseInsensitiveMatch,
  );

  // Explicitly verify that each of the four specific case variants exists in results
  // The search algorithm should return products matching 'phone' regardless of case
  const hasLowercase = searchResult.data.some((p) => p.title === "phone");
  const hasCamelcase = searchResult.data.some((p) => p.title === "Phone");
  const hasUppercase = searchResult.data.some((p) => p.title === "PHONE");
  const hasMixedcase = searchResult.data.some((p) => p.title === "pHoNe");

  TestValidator.predicate(
    "search finds lowercase variant 'phone'",
    hasLowercase,
  );
  TestValidator.predicate(
    "search finds camelcase variant 'Phone'",
    hasCamelcase,
  );
  TestValidator.predicate(
    "search finds uppercase variant 'PHONE'",
    hasUppercase,
  );
  TestValidator.predicate(
    "search finds mixedcase variant 'pHoNe'",
    hasMixedcase,
  );

  // Additional assertion: All found products must have 'phone' (case-insensitive) in their title
  searchResult.data.forEach((product) => {
    TestValidator.predicate(
      "product title contains 'phone' in any case variant",
      /phone/i.test(product.title),
    );
  });
}
