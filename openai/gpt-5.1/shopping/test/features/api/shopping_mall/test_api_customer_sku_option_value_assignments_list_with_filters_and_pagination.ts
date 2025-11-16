import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSkuOptionValueAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSkuOptionValueAssignment";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";
import type { IShoppingMallSkuOptionValueAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOptionValueAssignment";

/**
 * Validate customer listing of SKU option value assignments with filters and
 * pagination.
 *
 * Business flow:
 *
 * 1. Register platform admin, seller, and customer, and perform necessary logins
 *    to switch actors.
 * 2. As platform admin, create a brand and category tree for realistic catalog
 *    context.
 * 3. As seller, create a multi-SKU product bound to the created brand.
 * 4. Under that product, create two option types (COLOR and SIZE) and two option
 *    values for each.
 * 5. Create a SKU for the product.
 * 6. Create four SKU option value assignments (one for each option value) under
 *    the SKU.
 * 7. As customer, call the customer listing endpoint with different
 *    IShoppingMallSkuOptionValueAssignment.IRequest combinations:
 *
 *    - Basic pagination with page=1 and pageSize=1.
 *    - Filter by optionTypeCode for COLOR vs SIZE.
 *    - Filter by optionValueCode for RED vs BLUE and verify that the result sets
 *         differ.
 *    - Iterate over pages with pageSize=1 and ensure pagination metadata and union
 *         of IDs matches records.
 * 8. Use typia.assert on all non-void responses and TestValidator to validate
 *    pagination and filter semantics.
 */
export async function test_api_customer_sku_option_value_assignments_list_with_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register platform admin and log in (join already returns authorized admin with token)
  const platformAdminJoinBody = {
    email: `admin_${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. As platform admin, create a brand and category tree
  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: `Tree ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: categoryTreeBody,
      },
    );
  typia.assert(categoryTree);

  // 3. Register seller and log in
  const sellerJoinBody = {
    email: `seller_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    storeName: `Store ${RandomGenerator.name(1)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuth);

  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: "127.0.0.1",
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 4. As seller, create a multi-SKU product
  const productCode = `PROD-${RandomGenerator.alphaNumeric(8)}`;
  const productBody = {
    shopping_mall_seller_id: sellerLogin.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: `Product ${RandomGenerator.name(1)}`,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 5. Create two option types: COLOR and SIZE
  const colorOptionTypeBody = {
    name: "COLOR",
    display_name: "Color",
    display_order: 0,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const colorOptionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: product.code,
        body: colorOptionTypeBody,
      },
    );
  typia.assert(colorOptionType);

  const sizeOptionTypeBody = {
    name: "SIZE",
    display_name: "Size",
    display_order: 1,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const sizeOptionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: product.code,
        body: sizeOptionTypeBody,
      },
    );
  typia.assert(sizeOptionType);

  // 6. Create option values for COLOR (RED, BLUE) and SIZE (M, L)
  const redOptionValueBody = {
    value: "RED",
    display_name: "Red",
    display_order: 0,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const redOptionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: colorOptionType.id,
        body: redOptionValueBody,
      },
    );
  typia.assert(redOptionValue);

  const blueOptionValueBody = {
    value: "BLUE",
    display_name: "Blue",
    display_order: 1,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const blueOptionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: colorOptionType.id,
        body: blueOptionValueBody,
      },
    );
  typia.assert(blueOptionValue);

  const sizeMOptionValueBody = {
    value: "M",
    display_name: "Medium",
    display_order: 0,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const sizeMOptionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: sizeOptionType.id,
        body: sizeMOptionValueBody,
      },
    );
  typia.assert(sizeMOptionValue);

  const sizeLOptionValueBody = {
    value: "L",
    display_name: "Large",
    display_order: 1,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const sizeLOptionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: sizeOptionType.id,
        body: sizeLOptionValueBody,
      },
    );
  typia.assert(sizeLOptionValue);

  // 7. Create SKU for the product
  const skuCode = `SKU-${RandomGenerator.alphaNumeric(8)}`;
  const skuBody = {
    code: skuCode,
    name: `SKU ${RandomGenerator.name(1)}`,
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuBody,
    });
  typia.assert(sku);

  // 8. Create SKU option value assignments for each option value
  const assignments: IShoppingMallSkuOptionValueAssignment[] = [];

  const createAssignment = async (
    productOptionTypeCode: string,
    productOptionValueCode: string,
    orderIndex: number,
  ) => {
    const assignmentBody = {
      productOptionTypeCode,
      productOptionValueCode,
      orderIndex,
    } satisfies IShoppingMallSkuOptionValueAssignment.ICreate;

    const created: IShoppingMallSkuOptionValueAssignment =
      await api.functional.shoppingMall.seller.products.skus.optionValueAssignments.create(
        connection,
        {
          productCode: product.code,
          skuCode: sku.code,
          body: assignmentBody,
        },
      );
    typia.assert(created);
    assignments.push(created);
  };

  await createAssignment(colorOptionType.name, redOptionValue.value, 0);
  await createAssignment(colorOptionType.name, blueOptionValue.value, 1);
  await createAssignment(sizeOptionType.name, sizeMOptionValue.value, 2);
  await createAssignment(sizeOptionType.name, sizeLOptionValue.value, 3);

  TestValidator.predicate(
    "created at least four assignments for SKU",
    assignments.length === 4,
  );

  // 9. Register customer and log in
  const customerJoinBody = {
    email: `customer_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuth);

  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: "127.0.0.1",
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/landing",
    userAgent: "E2E-Test-Agent",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  // Helper to call customer listing
  const listAssignments = async (
    request: IShoppingMallSkuOptionValueAssignment.IRequest,
  ): Promise<IPageIShoppingMallSkuOptionValueAssignment.ISummary> => {
    const page: IPageIShoppingMallSkuOptionValueAssignment.ISummary =
      await api.functional.shoppingMall.customer.products.skus.optionValueAssignments.index(
        connection,
        {
          productCode: product.code,
          skuCode: sku.code,
          body: request,
        },
      );
    typia.assert(page);
    return page;
  };

  // 10. Basic pagination: page=1, pageSize=1
  const baseRequest: IShoppingMallSkuOptionValueAssignment.IRequest = {
    page: 1,
    pageSize: 1,
    sortBy: "createdAt",
    sortDirection: "asc",
  };

  const firstPage = await listAssignments(baseRequest);

  TestValidator.predicate(
    "pagination.limit respects requested pageSize",
    firstPage.pagination.limit === 1,
  );
  TestValidator.predicate(
    "pagination.current is within pages range",
    firstPage.pagination.current >= 0 &&
      firstPage.pagination.current <
        (firstPage.pagination.pages === 0 ? 1 : firstPage.pagination.pages),
  );
  TestValidator.predicate(
    "data length is <= pageSize",
    firstPage.data.length <= 1,
  );

  const totalRecords = firstPage.pagination.records;
  TestValidator.predicate(
    "totalRecords matches assignments length (expect 4)",
    totalRecords === assignments.length,
  );

  // 11. Filter by optionTypeCode = COLOR
  const colorFilterRequest: IShoppingMallSkuOptionValueAssignment.IRequest = {
    page: 1,
    pageSize: 10,
    optionTypeCode: colorOptionType.name,
  };

  const colorPage = await listAssignments(colorFilterRequest);

  TestValidator.predicate(
    "color filter returns at most pageSize records",
    colorPage.data.length <= 10,
  );

  const colorAssignmentsCount = assignments.filter(
    (a) => a.productOptionTypeCode === colorOptionType.name,
  ).length;

  TestValidator.equals(
    "color filter pagination.records equals number of color assignments",
    colorPage.pagination.records,
    colorAssignmentsCount,
  );

  for (const summary of colorPage.data) {
    TestValidator.predicate(
      "color filter returned only COLOR values (RED/BLUE)",
      summary.option_value.value === redOptionValue.value ||
        summary.option_value.value === blueOptionValue.value,
    );
  }

  // 12. Filter by optionTypeCode = SIZE
  const sizeFilterRequest: IShoppingMallSkuOptionValueAssignment.IRequest = {
    page: 1,
    pageSize: 10,
    optionTypeCode: sizeOptionType.name,
  };

  const sizePage = await listAssignments(sizeFilterRequest);

  const sizeAssignmentsCount = assignments.filter(
    (a) => a.productOptionTypeCode === sizeOptionType.name,
  ).length;

  TestValidator.equals(
    "size filter pagination.records equals number of size assignments",
    sizePage.pagination.records,
    sizeAssignmentsCount,
  );

  for (const summary of sizePage.data) {
    TestValidator.predicate(
      "size filter returned only SIZE values (M/L)",
      summary.option_value.value === sizeMOptionValue.value ||
        summary.option_value.value === sizeLOptionValue.value,
    );
  }

  // Ensure COLOR vs SIZE filters produce different sets of assignment IDs
  const colorIds = colorPage.data.map((s) => s.id).sort();
  const sizeIds = sizePage.data.map((s) => s.id).sort();

  TestValidator.predicate(
    "COLOR and SIZE filters should not return identical ID sets",
    JSON.stringify(colorIds) !== JSON.stringify(sizeIds),
  );

  // 13. Filter by optionValueCode = RED and BLUE respectively
  const redFilterRequest: IShoppingMallSkuOptionValueAssignment.IRequest = {
    page: 1,
    pageSize: 10,
    optionValueCode: redOptionValue.value,
  };

  const redPage = await listAssignments(redFilterRequest);

  TestValidator.predicate(
    "RED filter returns at most pageSize records",
    redPage.data.length <= 10,
  );

  for (const summary of redPage.data) {
    TestValidator.equals(
      "RED filter returns only RED option values",
      summary.option_value.value,
      redOptionValue.value,
    );
  }

  const blueFilterRequest: IShoppingMallSkuOptionValueAssignment.IRequest = {
    page: 1,
    pageSize: 10,
    optionValueCode: blueOptionValue.value,
  };

  const bluePage = await listAssignments(blueFilterRequest);

  for (const summary of bluePage.data) {
    TestValidator.equals(
      "BLUE filter returns only BLUE option values",
      summary.option_value.value,
      blueOptionValue.value,
    );
  }

  const redIds = redPage.data.map((s) => s.id).sort();
  const blueIds = bluePage.data.map((s) => s.id).sort();

  TestValidator.predicate(
    "RED and BLUE filters should not return identical ID sets",
    JSON.stringify(redIds) !== JSON.stringify(blueIds),
  );

  // 14. Pagination consistency: page=1 and page=2 with pageSize=1 under COLOR filter
  const colorPage1 = await listAssignments({
    page: 1,
    pageSize: 1,
    optionTypeCode: colorOptionType.name,
  });

  const colorPage2 = await listAssignments({
    page: 2,
    pageSize: 1,
    optionTypeCode: colorOptionType.name,
  });

  const colorCombinedIds = [
    ...colorPage1.data.map((s) => s.id),
    ...colorPage2.data.map((s) => s.id),
  ];

  TestValidator.predicate(
    "combined color page IDs count should be <= total color assignments",
    colorCombinedIds.length <= colorAssignmentsCount,
  );

  TestValidator.equals(
    "color pagination.records consistent with known color assignments count",
    colorPage1.pagination.records,
    colorAssignmentsCount,
  );
}
