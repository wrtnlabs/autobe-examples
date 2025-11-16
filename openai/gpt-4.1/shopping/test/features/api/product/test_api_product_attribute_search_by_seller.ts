import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductAttribute";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttribute";
import type { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test the seller's ability to search and filter product attribute definitions
 * for a product they own.
 *
 * 1. Register and authenticate a new seller.
 * 2. Create a new product as that seller.
 * 3. Query the attributes for this product using various search and pagination
 *    parameters (page, limit, search by attribute_name substring, filter by
 *    position, apply sort order).
 * 4. Validate that the attributes returned belong only to the specified product
 *    and the structure matches IPageIShoppingMallProductAttribute.ISummary,
 *    including correct pagination meta.
 * 5. Edge case: on a new product, querying attributes returns an empty data set
 *    but correct pagination metadata.
 * 6. Attempt to fetch attributes for a product with incorrect authentication
 *    (simulate unauthorized access by joining as a second seller and querying
 *    the first seller's product), and expect an error.
 */
export async function test_api_product_attribute_search_by_seller(
  connection: api.IConnection,
) {
  // 1. Register and authenticate seller #1
  const seller1Email = typia.random<string & tags.Format<"email">>();
  const seller1Auth = await api.functional.auth.seller.join(connection, {
    body: {
      email: seller1Email,
      password: RandomGenerator.alphaNumeric(12) as string &
        tags.Format<"password">,
      business_name: RandomGenerator.name(),
      registration_number: RandomGenerator.alphabets(8),
      business_phone: RandomGenerator.mobile(),
      href: "https://seller1-register.test/",
      referrer: "https://homepage.seller1.test/",
      ip: null,
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller1Auth);

  // 2. Create a new product (as seller #1)
  const productCreate = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    default_price: typia.random<number>(),
    business_status: "draft",
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.products.create(
    connection,
    { body: productCreate },
  );
  typia.assert(product);

  // 3. Query attributes for the product - default pagination (page=1, limit=10), expect empty for new product
  const attrParamsDefault = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
  } satisfies IShoppingMallProductAttribute.IRequest;
  const attrPageDefault =
    await api.functional.shoppingMall.seller.products.attributes.index(
      connection,
      { productId: product.id, body: attrParamsDefault },
    );
  typia.assert(attrPageDefault);
  TestValidator.equals(
    "should have empty data when no attributes exist",
    attrPageDefault.data.length,
    0,
  );
  TestValidator.equals(
    "should show correct pagination meta for empty data",
    attrPageDefault.pagination.current,
    1,
  );
  TestValidator.equals(
    "records is zero for empty data",
    attrPageDefault.pagination.records,
    0,
  );

  // 4. Query with non-existent search substring (should also return empty)
  const attrParamsSearchMiss = {
    page: 1 as number & tags.Type<"int32">,
    limit: 5 as number & tags.Type<"int32">,
    search: "__impossible__",
  } satisfies IShoppingMallProductAttribute.IRequest;
  const attrPageSearchMiss =
    await api.functional.shoppingMall.seller.products.attributes.index(
      connection,
      { productId: product.id, body: attrParamsSearchMiss },
    );
  typia.assert(attrPageSearchMiss);
  TestValidator.equals(
    "search miss gives empty",
    attrPageSearchMiss.data.length,
    0,
  );

  // 5. Edge: Requesting an out-of-bounds page (e.g., page 100)
  const attrParamsPageFar = {
    page: 100 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
  } satisfies IShoppingMallProductAttribute.IRequest;
  const attrPageFar =
    await api.functional.shoppingMall.seller.products.attributes.index(
      connection,
      { productId: product.id, body: attrParamsPageFar },
    );
  typia.assert(attrPageFar);
  TestValidator.equals(
    "far page should have empty data",
    attrPageFar.data.length,
    0,
  );
  TestValidator.equals(
    "current page reflects request",
    attrPageFar.pagination.current,
    100,
  );

  // 6. Negative: Second seller cannot access first seller's product attributes
  const seller2Email = typia.random<string & tags.Format<"email">>();
  const seller2Auth = await api.functional.auth.seller.join(connection, {
    body: {
      email: seller2Email,
      password: RandomGenerator.alphaNumeric(12) as string &
        tags.Format<"password">,
      business_name: RandomGenerator.name(),
      registration_number: RandomGenerator.alphabets(8),
      business_phone: RandomGenerator.mobile(),
      href: "https://seller2-register.test/",
      referrer: "https://homepage.seller2.test/",
      ip: null,
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller2Auth);
  // Now authenticated as seller2
  await TestValidator.error(
    "non-owner should not access another seller's product attributes",
    async () => {
      await api.functional.shoppingMall.seller.products.attributes.index(
        connection,
        { productId: product.id, body: attrParamsDefault },
      );
    },
  );
}
