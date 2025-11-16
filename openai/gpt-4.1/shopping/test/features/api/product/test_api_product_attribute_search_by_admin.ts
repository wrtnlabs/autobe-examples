import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductAttribute";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttribute";
import type { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate admin attribute search, pagination, filtering for any product
 *
 * - Register and authenticate a new shopping mall admin.
 * - Create a new product (ensures product exists to query attributes).
 * - Query that product's attributes using all available
 *   IShoppingMallProductAttribute.IRequest options (search, position,
 *   pagination, sort), via
 *   /shoppingMall/admin/products/{productId}/attributes.
 * - Validate empty and non-existent filter scenarios (should always be empty
 *   initially), correct pagination, and business rule that admin can access any
 *   product's attributes.
 */
export async function test_api_product_attribute_search_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new admin.
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword satisfies string,
      name: RandomGenerator.name(),
    },
  });
  typia.assert(admin);

  // 2. Create a new product to query
  const productInput = {
    title: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    default_price: 5000,
    business_status: "published",
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.products.create(
    connection,
    { body: productInput },
  );
  typia.assert(product);

  // 3. Query attributes for the product (should be none - edge case)
  const emptyQuery = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
  } satisfies IShoppingMallProductAttribute.IRequest;
  const emptyResult =
    await api.functional.shoppingMall.admin.products.attributes.index(
      connection,
      {
        productId: product.id,
        body: emptyQuery,
      },
    );
  typia.assert(emptyResult);
  TestValidator.predicate(
    "admin querying attributes on new product returns empty data",
    emptyResult.data.length === 0,
  );

  // 4. Query using non-existent attribute name filter
  const nameFilteredQuery = {
    ...emptyQuery,
    search: "foobar-nonexistent",
  } satisfies IShoppingMallProductAttribute.IRequest;
  const nonexistNameResult =
    await api.functional.shoppingMall.admin.products.attributes.index(
      connection,
      {
        productId: product.id,
        body: nameFilteredQuery,
      },
    );
  typia.assert(nonexistNameResult);
  TestValidator.predicate(
    "non-existent attribute name returns 0 data",
    nonexistNameResult.data.length === 0,
  );

  // 5. Query using a position that is unlikely to exist
  const positionFilteredQuery = {
    ...emptyQuery,
    position: 9999 as number & tags.Type<"int32">,
  } satisfies IShoppingMallProductAttribute.IRequest;
  const nonexistPosResult =
    await api.functional.shoppingMall.admin.products.attributes.index(
      connection,
      {
        productId: product.id,
        body: positionFilteredQuery,
      },
    );
  typia.assert(nonexistPosResult);
  TestValidator.predicate(
    "non-existent attribute position returns 0 data",
    nonexistPosResult.data.length === 0,
  );

  // 6. Validate pagination for various limits (data always empty)
  for (const limit of [1, 5, 10, 20] as const) {
    const pagedQuery = {
      ...emptyQuery,
      limit: limit as number & tags.Type<"int32">,
    } satisfies IShoppingMallProductAttribute.IRequest;
    const pagedResult =
      await api.functional.shoppingMall.admin.products.attributes.index(
        connection,
        {
          productId: product.id,
          body: pagedQuery,
        },
      );
    typia.assert(pagedResult);
    TestValidator.equals(
      `pagination with limit ${limit} returns 0 data`,
      pagedResult.data.length,
      0,
    );
  }
}
