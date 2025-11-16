import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSkuOptionValueAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSkuOptionValueAssignment";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
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

export async function test_api_seller_sku_option_value_assignments_list_with_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register seller
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
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  const sellerEmail = sellerAuthorized.email;
  const sellerPassword = sellerJoinBody.password;

  // 2. Register and login platform admin, then create a brand
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(platformAdminAuthorized);

  const brandCreateBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri: "https://cdn.example.com/logo/" + RandomGenerator.alphaNumeric(8),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert<IShoppingMallBrand>(brand);

  // 3. Switch back to seller session via login
  const _: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        ip: null,
        href: "https://seller.example.com/login",
        referrer: "https://seller.example.com/",
      } satisfies IShoppingMallSellerLogin.IRequest,
    });

  // 4. Create product for this seller
  const productCode: string & tags.MinLength<1> =
    RandomGenerator.alphaNumeric(10);

  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.name(3),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.example.com/product/" + RandomGenerator.alphaNumeric(12),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 5. Create option types: COLOR and SIZE
  const colorOptionTypeName = "COLOR";
  const sizeOptionTypeName = "SIZE";

  const colorOptionTypeCreateBody = {
    name: colorOptionTypeName,
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const colorOptionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: product.code,
        body: colorOptionTypeCreateBody,
      },
    );
  typia.assert<IShoppingMallProductOptionType>(colorOptionType);

  const sizeOptionTypeCreateBody = {
    name: sizeOptionTypeName,
    display_name: "Size",
    display_order: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const sizeOptionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: product.code,
        body: sizeOptionTypeCreateBody,
      },
    );
  typia.assert<IShoppingMallProductOptionType>(sizeOptionType);

  // 6. Create option values under each type
  const colorRedValue = "RED";
  const colorBlueValue = "BLUE";

  const sizeMValue = "M";
  const sizeLValue = "L";

  const colorRed: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: colorOptionType.id,
        body: {
          value: colorRedValue,
          display_name: "Red",
          display_order: 0 as number & tags.Type<"int32">,
          is_active: true,
        } satisfies IShoppingMallProductOptionValue.ICreate,
      },
    );
  typia.assert<IShoppingMallProductOptionValue>(colorRed);

  const colorBlue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: colorOptionType.id,
        body: {
          value: colorBlueValue,
          display_name: "Blue",
          display_order: 1 as number & tags.Type<"int32">,
          is_active: true,
        } satisfies IShoppingMallProductOptionValue.ICreate,
      },
    );
  typia.assert<IShoppingMallProductOptionValue>(colorBlue);

  const sizeM: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: sizeOptionType.id,
        body: {
          value: sizeMValue,
          display_name: "M",
          display_order: 0 as number & tags.Type<"int32">,
          is_active: true,
        } satisfies IShoppingMallProductOptionValue.ICreate,
      },
    );
  typia.assert<IShoppingMallProductOptionValue>(sizeM);

  const sizeL: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: sizeOptionType.id,
        body: {
          value: sizeLValue,
          display_name: "L",
          display_order: 1 as number & tags.Type<"int32">,
          is_active: true,
        } satisfies IShoppingMallProductOptionValue.ICreate,
      },
    );
  typia.assert<IShoppingMallProductOptionValue>(sizeL);

  // 7. Create SKU
  const skuCode = "SKU1";
  const skuCreateBody = {
    code: skuCode,
    name: product.name + " Variant 1",
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuCreateBody,
    });
  typia.assert<IShoppingMallProductSku>(sku);

  TestValidator.equals(
    "sku code should match requested code",
    sku.code,
    skuCode,
  );

  // 8. Create SKU option value assignments for COLOR and SIZE
  const assignmentInputs: IShoppingMallSkuOptionValueAssignment.ICreate[] = [
    {
      productOptionTypeCode: colorOptionTypeName,
      productOptionValueCode: colorRedValue,
      orderIndex: 0 as number & tags.Type<"int32">,
    },
    {
      productOptionTypeCode: colorOptionTypeName,
      productOptionValueCode: colorBlueValue,
      orderIndex: 1 as number & tags.Type<"int32">,
    },
    {
      productOptionTypeCode: sizeOptionTypeName,
      productOptionValueCode: sizeMValue,
      orderIndex: 0 as number & tags.Type<"int32">,
    },
    {
      productOptionTypeCode: sizeOptionTypeName,
      productOptionValueCode: sizeLValue,
      orderIndex: 1 as number & tags.Type<"int32">,
    },
  ];

  const createdAssignments: IShoppingMallSkuOptionValueAssignment[] = [];

  for (const body of assignmentInputs) {
    const assignment =
      await api.functional.shoppingMall.seller.products.skus.optionValueAssignments.create(
        connection,
        {
          productCode: product.code,
          skuCode: sku.code,
          body,
        },
      );
    typia.assert<IShoppingMallSkuOptionValueAssignment>(assignment);
    createdAssignments.push(assignment);
  }

  // Helper sets for validation
  const colorValueCodes = new Set<string>([colorRedValue, colorBlueValue]);
  const sizeValueCodes = new Set<string>([sizeMValue, sizeLValue]);

  // 9. List assignments filtered by COLOR with pagination page=1, pageSize=2
  const pageSize = 2 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;

  const colorPage: IPageIShoppingMallSkuOptionValueAssignment.ISummary =
    await api.functional.shoppingMall.seller.products.skus.optionValueAssignments.index(
      connection,
      {
        productCode: product.code,
        skuCode: sku.code,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          pageSize,
          optionTypeCode: colorOptionTypeName,
          sortBy: undefined,
          sortDirection: undefined,
          optionValueCode: undefined,
          createdFrom: undefined,
          createdTo: undefined,
        } satisfies IShoppingMallSkuOptionValueAssignment.IRequest,
      },
    );
  typia.assert<IPageIShoppingMallSkuOptionValueAssignment.ISummary>(colorPage);

  const pagination = colorPage.pagination;
  const colorData = colorPage.data;

  TestValidator.equals(
    "pagination limit should equal requested pageSize",
    pagination.limit,
    pageSize,
  );

  TestValidator.equals(
    "first page index should be 0 for page=1",
    pagination.current,
    0,
  );

  TestValidator.equals(
    "there should be exactly 2 COLOR assignments in total",
    pagination.records,
    2,
  );

  TestValidator.predicate(
    "color page data length should be <= pageSize",
    colorData.length <= pagination.limit,
  );

  for (const summary of colorData) {
    typia.assert<IShoppingMallSkuOptionValueAssignment.ISummary>(summary);

    TestValidator.predicate(
      "color filter should exclude SIZE option values",
      colorValueCodes.has(summary.option_value.value) &&
        !sizeValueCodes.has(summary.option_value.value),
    );
  }

  // 10. Ensure color data IDs are subset of created COLOR assignments
  const createdColorAssignments = createdAssignments.filter((a) =>
    colorValueCodes.has(a.productOptionValueCode),
  );

  const createdColorIds = new Set<string>(
    createdColorAssignments.map((a) => a.id),
  );

  for (const summary of colorData) {
    TestValidator.predicate(
      "COLOR page summaries must come from created COLOR assignments",
      createdColorIds.has(summary.id),
    );
  }

  TestValidator.equals(
    "total COLOR assignments count should be 2",
    createdColorAssignments.length,
    2,
  );

  // 11. Filter by COLOR + specific optionValueCode RED
  const redPage: IPageIShoppingMallSkuOptionValueAssignment.ISummary =
    await api.functional.shoppingMall.seller.products.skus.optionValueAssignments.index(
      connection,
      {
        productCode: product.code,
        skuCode: sku.code,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          pageSize,
          optionTypeCode: colorOptionTypeName,
          optionValueCode: colorRedValue,
          sortBy: undefined,
          sortDirection: undefined,
          createdFrom: undefined,
          createdTo: undefined,
        } satisfies IShoppingMallSkuOptionValueAssignment.IRequest,
      },
    );
  typia.assert<IPageIShoppingMallSkuOptionValueAssignment.ISummary>(redPage);

  TestValidator.equals(
    "RED filter should have exactly one matching record",
    redPage.pagination.records,
    1,
  );

  TestValidator.equals(
    "RED filter should have exactly one page",
    redPage.pagination.pages,
    1,
  );

  TestValidator.predicate(
    "RED filter first page should have at least one item",
    redPage.data.length >= 1,
  );

  for (const summary of redPage.data) {
    typia.assert<IShoppingMallSkuOptionValueAssignment.ISummary>(summary);
    TestValidator.equals(
      "all RED filter results should have RED option value",
      summary.option_value.value,
      colorRedValue,
    );
  }

  // 12. Pagination across multiple pages for COLOR with pageSize=1
  const pageSizeOne = 1 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;

  const colorPage1 =
    await api.functional.shoppingMall.seller.products.skus.optionValueAssignments.index(
      connection,
      {
        productCode: product.code,
        skuCode: sku.code,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          pageSize: pageSizeOne,
          optionTypeCode: colorOptionTypeName,
          optionValueCode: undefined,
          sortBy: undefined,
          sortDirection: undefined,
          createdFrom: undefined,
          createdTo: undefined,
        } satisfies IShoppingMallSkuOptionValueAssignment.IRequest,
      },
    );
  typia.assert<IPageIShoppingMallSkuOptionValueAssignment.ISummary>(colorPage1);

  const colorPage2 =
    await api.functional.shoppingMall.seller.products.skus.optionValueAssignments.index(
      connection,
      {
        productCode: product.code,
        skuCode: sku.code,
        body: {
          page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
          pageSize: pageSizeOne,
          optionTypeCode: colorOptionTypeName,
          optionValueCode: undefined,
          sortBy: undefined,
          sortDirection: undefined,
          createdFrom: undefined,
          createdTo: undefined,
        } satisfies IShoppingMallSkuOptionValueAssignment.IRequest,
      },
    );
  typia.assert<IPageIShoppingMallSkuOptionValueAssignment.ISummary>(colorPage2);

  TestValidator.equals(
    "pageSize=1 should be reflected in pagination.limit",
    colorPage1.pagination.limit,
    pageSizeOne,
  );

  TestValidator.equals(
    "pageSize=1 total COLOR records should still be 2",
    colorPage1.pagination.records,
    2,
  );

  TestValidator.equals(
    "pageSize=1 pagination pages should be 2",
    colorPage1.pagination.pages,
    2,
  );

  TestValidator.equals(
    "first COLOR page (page=1) index should be 0",
    colorPage1.pagination.current,
    0,
  );

  TestValidator.equals(
    "second COLOR page (page=2) index should be 1",
    colorPage2.pagination.current,
    1,
  );

  TestValidator.equals(
    "COLOR page1 should have exactly 1 item",
    colorPage1.data.length,
    1,
  );

  TestValidator.equals(
    "COLOR page2 should have exactly 1 item",
    colorPage2.data.length,
    1,
  );

  const page1Id = colorPage1.data[0]?.id;
  const page2Id = colorPage2.data[0]?.id;

  TestValidator.predicate(
    "two COLOR pages should have different assignment ids",
    page1Id !== page2Id,
  );

  TestValidator.predicate(
    "both pagination pages should correspond to created COLOR assignments",
    !!page1Id &&
      !!page2Id &&
      createdColorIds.has(page1Id) &&
      createdColorIds.has(page2Id),
  );
}
