import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductOptionValue";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Validate listing and pagination of option values for a configured product
 * option type.
 *
 * Business goal: Ensure that once a seller has configured a product with an
 * option type (e.g., Color) and several option values (e.g., red, blue, green),
 * the public option value search endpoint
 * `/shoppingMall/products/{productCode}/optionTypes/{productOptionTypeId}/values`
 * correctly returns a paginated list containing those values with accurate
 * pagination metadata and deterministic ordering.
 *
 * Scenario steps:
 *
 * 1. Join as platform admin and login to obtain an authenticated platform admin
 *    session.
 * 2. As platform admin, create a brand via POST
 *    /shoppingMall/platformAdmin/brands.
 * 3. Join as a seller and login to obtain an authenticated seller session.
 * 4. As the seller, create a product with is_multi_sku = true and active-like
 *    status, associating it with the created brand and using a unique product
 *    code.
 * 5. As the seller, create a product option type (e.g., "Color") for that product
 *    with a specific display_order.
 * 6. As the seller, create multiple option values (e.g., red, blue, green) under
 *    that option type using POST
 *    /shoppingMall/seller/products/{productCode}/optionTypes/{productOptionTypeId}/values
 *    with distinct display_order values and is_active=true.
 * 7. Call PATCH
 *    /shoppingMall/products/{productCode}/optionTypes/{productOptionTypeId}/values
 *    with a body that requests page=1 and a sufficiently large limit and no
 *    additional filters so that all created values should be returned in one
 *    page.
 * 8. Assert that the response matches
 *    IPageIShoppingMallProductOptionValue.ISummary via typia.assert, then
 *    validate pagination metadata (records count is at least the number of
 *    created values, pages >= 1 when records > 0, limit matches request or
 *    documented behavior, and current page index is within [0, pages)).
 * 9. Validate that the data array in IPageIShoppingMallProductOptionValue.ISummary
 *    contains all the created option values with correct value and displayName,
 *    and that their relative ordering matches ascending display_order.
 * 10. Optionally perform a second call with a smaller limit (e.g., limit=2) to
 *     ensure pagination splits the records across pages consistently without
 *     duplicating our created values.
 */
export async function test_api_product_option_values_list_for_configured_product_option_type(
  connection: api.IConnection,
) {
  // 1. Platform admin join
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Platform admin login (simulate typical flow even though join already authenticated)
  const platformAdminLoginBody = {
    email: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/join-complete",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  // 3. Create a brand as platform admin
  const brandCreateBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: undefined,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 4. Seller join
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 5. Seller login (ensure explicit seller session)
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/join-complete",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 6. Create product owned by the seller and associated with the brand
  const productCode: string & tags.MinLength<1> = RandomGenerator.alphaNumeric(
    10,
  ) as string & tags.MinLength<1>;

  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: null,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  TestValidator.equals(
    "product code should match request",
    product.code,
    productCreateBody.code,
  );

  // 7. Create option type for this product
  const optionTypeCreateBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: product.code,
        body: optionTypeCreateBody,
      },
    );
  typia.assert(optionType);

  TestValidator.equals(
    "option type name should match request",
    optionType.name,
    optionTypeCreateBody.name,
  );

  // 8. Create multiple option values under this option type
  const optionValueSpecs = [
    { value: "red", displayName: "Red", order: 1 },
    { value: "blue", displayName: "Blue", order: 2 },
    { value: "green", displayName: "Green", order: 3 },
  ] as const;

  const createdOptionValues: IShoppingMallProductOptionValue[] = [];

  for (const spec of optionValueSpecs) {
    const body = {
      value: spec.value,
      display_name: spec.displayName,
      display_order: spec.order as number & tags.Type<"int32">,
      is_active: true,
    } satisfies IShoppingMallProductOptionValue.ICreate;

    const created: IShoppingMallProductOptionValue =
      await api.functional.shoppingMall.seller.products.optionTypes.values.create(
        connection,
        {
          productCode: product.code,
          productOptionTypeId: optionType.id,
          body,
        },
      );
    typia.assert(created);
    createdOptionValues.push(created);
  }

  TestValidator.equals(
    "created option values count should match specs",
    createdOptionValues.length,
    optionValueSpecs.length,
  );

  // 9. Call the public option values index endpoint with page=1 and large limit
  const listRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    search: null,
    value: null,
    display_name: null,
    is_active: null,
    order_by: null,
    order_direction: null,
  } satisfies IShoppingMallProductOptionValue.IRequest;

  const listResponse: IPageIShoppingMallProductOptionValue.ISummary =
    await api.functional.shoppingMall.products.optionTypes.values.index(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: optionType.id as string & tags.Format<"uuid">,
        body: listRequestBody,
      },
    );
  typia.assert(listResponse);

  const pagination: IPage.IPagination = listResponse.pagination;

  // Validate pagination metadata
  TestValidator.predicate(
    "records should be at least number of created option values",
    pagination.records >= createdOptionValues.length,
  );

  TestValidator.equals(
    "limit should reflect requested page size",
    pagination.limit,
    listRequestBody.limit,
  );

  TestValidator.predicate(
    "current page index should be within valid range",
    pagination.pages === 0
      ? pagination.current === 0
      : pagination.current >= 0 && pagination.current < pagination.pages,
  );

  // Validate that all created values exist in the returned data and ordering
  const summaries = listResponse.data;

  // Map summaries by value for easier lookup
  const summaryByValue = new Map<
    string,
    IShoppingMallProductOptionValue.ISummary
  >();
  for (const s of summaries) {
    summaryByValue.set(s.value, s);
  }

  for (const spec of optionValueSpecs) {
    const summary = summaryByValue.get(spec.value);
    TestValidator.predicate(
      `summary for value ${spec.value} should exist`,
      !!summary,
    );
    if (summary) {
      TestValidator.equals(
        `displayName for value ${spec.value} should match`,
        summary.displayName ?? summary.value,
        spec.displayName,
      );
    }
  }

  // Check ordering by display_order ascending for the created set
  const sortedCreated = [...createdOptionValues].sort(
    (a, b) => a.display_order - b.display_order,
  );

  const filteredSummaries = summaries.filter((s) =>
    optionValueSpecs.some((spec) => spec.value === s.value),
  );

  TestValidator.predicate(
    "filtered summaries should contain at least created values",
    filteredSummaries.length >= sortedCreated.length,
  );

  for (
    let i = 0;
    i < sortedCreated.length && i < filteredSummaries.length;
    i++
  ) {
    const expected = sortedCreated[i];
    const actual = filteredSummaries[i];
    TestValidator.equals(
      `ordered value at index ${i} should match created display_order sequence`,
      actual.value,
      expected.value,
    );
  }

  // 10. Optional: call again with smaller limit to verify pagination consistency
  const smallPageRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    search: null,
    value: null,
    display_name: null,
    is_active: null,
    order_by: null,
    order_direction: null,
  } satisfies IShoppingMallProductOptionValue.IRequest;

  const firstPage =
    await api.functional.shoppingMall.products.optionTypes.values.index(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: optionType.id as string & tags.Format<"uuid">,
        body: smallPageRequestBody,
      },
    );
  typia.assert(firstPage);

  const secondPageRequestBody = {
    ...smallPageRequestBody,
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallProductOptionValue.IRequest;

  const secondPage =
    await api.functional.shoppingMall.products.optionTypes.values.index(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: optionType.id as string & tags.Format<"uuid">,
        body: secondPageRequestBody,
      },
    );
  typia.assert(secondPage);

  const createdIds = new Set(createdOptionValues.map((v) => v.id));
  const firstIds = firstPage.data
    .map((s) => s.id)
    .filter((id) => createdIds.has(id));
  const secondIds = secondPage.data
    .map((s) => s.id)
    .filter((id) => createdIds.has(id));

  const overlap = firstIds.filter((id) => secondIds.includes(id));
  TestValidator.equals(
    "no overlapping created option value ids between first and second page",
    overlap.length,
    0,
  );
}
