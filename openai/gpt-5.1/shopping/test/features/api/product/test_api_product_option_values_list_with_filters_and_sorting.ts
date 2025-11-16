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

export async function test_api_product_option_values_list_with_filters_and_sorting(
  connection: api.IConnection,
) {
  // 1. Platform admin joins and logs in to be allowed to create a brand.
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://admin.shoppingmall.test/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;
  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  const platformAdminLoginBody = {
    email: platformAdmin.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.shoppingmall.test/login",
    referrer: "https://admin.shoppingmall.test/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;
  const platformAdminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 2. Platform admin creates a brand.
  const brandCreateBody = {
    name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 4,
      wordMax: 8,
    }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 10,
    }),
    logo_uri:
      "https://cdn.shoppingmall.test/logo/" + RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Seller joins and logs in.
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 4,
      wordMax: 8,
    }),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.shoppingmall.test/login",
    referrer: "https://seller.shoppingmall.test/",
  } satisfies IShoppingMallSellerLogin.IRequest;
  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // 4. Seller creates a product using the created brand.
  const productCode = "PRD-" + RandomGenerator.alphaNumeric(8);
  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 8,
    }),
    short_description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 4,
      wordMax: 8,
    }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 10,
    }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.shoppingmall.test/products/" +
      RandomGenerator.alphaNumeric(16),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);
  TestValidator.equals("product code should match", product.code, productCode);

  // 5. Seller creates an option type for that product.
  const optionTypeCreateBody = {
    name: "Size",
    display_name: "Size",
    display_order: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
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

  // 6. Seller creates multiple option values with various combinations.
  const valuesToCreate: Array<{
    value: string;
    display_name: string | null;
    display_order: number & tags.Type<"int32">;
    is_active: boolean;
  }> = [
    {
      value: "S",
      display_name: "Small",
      display_order: 1 as number & tags.Type<"int32">,
      is_active: true,
    },
    {
      value: "M",
      display_name: "Medium",
      display_order: 2 as number & tags.Type<"int32">,
      is_active: true,
    },
    {
      value: "L",
      display_name: "Large",
      display_order: 3 as number & tags.Type<"int32">,
      is_active: false,
    },
    {
      value: "XL",
      display_name: null,
      display_order: 4 as number & tags.Type<"int32">,
      is_active: true,
    },
  ];

  const createdValues: IShoppingMallProductOptionValue[] = [];
  for (const spec of valuesToCreate) {
    const body = {
      value: spec.value,
      display_name: spec.display_name,
      display_order: spec.display_order,
      is_active: spec.is_active,
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
    createdValues.push(created);
  }

  // Helper to call index conveniently.
  const list = async (
    body: IShoppingMallProductOptionValue.IRequest,
  ): Promise<IPageIShoppingMallProductOptionValue.ISummary> => {
    const page =
      await api.functional.shoppingMall.products.optionTypes.values.index(
        connection,
        {
          productCode: product.code,
          productOptionTypeId: optionType.id as string & tags.Format<"uuid">,
          body,
        },
      );
    typia.assert(page);
    return page;
  };

  // 7. Filter by exact value (e.g., "M").
  const valueFilterRequest: IShoppingMallProductOptionValue.IRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    search: null,
    value: "M",
    display_name: null,
    is_active: null,
    order_by: "display_order",
    order_direction: "asc",
  };
  const valueFiltered = await list(valueFilterRequest);
  const expectedValueFiltered = createdValues.filter((v) => v.value === "M");
  TestValidator.equals(
    "value filter records count",
    valueFiltered.pagination.records,
    expectedValueFiltered.length,
  );
  TestValidator.equals(
    "value filter data length",
    valueFiltered.data.length,
    expectedValueFiltered.length,
  );
  for (const item of valueFiltered.data) {
    TestValidator.equals("value filter item value", item.value, "M");
  }

  // 8. Filter by display_name exact match ("Medium").
  const displayNameFilterRequest: IShoppingMallProductOptionValue.IRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    search: null,
    value: null,
    display_name: "Medium",
    is_active: null,
    order_by: "display_order",
    order_direction: "asc",
  };
  const displayNameFiltered = await list(displayNameFilterRequest);
  const expectedDisplayNameFiltered = createdValues.filter(
    (v) => v.display_name === "Medium",
  );
  TestValidator.equals(
    "display_name filter records count",
    displayNameFiltered.pagination.records,
    expectedDisplayNameFiltered.length,
  );
  TestValidator.equals(
    "display_name filter data length",
    displayNameFiltered.data.length,
    expectedDisplayNameFiltered.length,
  );
  for (const item of displayNameFiltered.data) {
    TestValidator.equals(
      "display_name filter item displayName",
      item.displayName ?? item.value,
      "Medium",
    );
  }

  // 9. Filter by is_active=true.
  const activeFilterRequest: IShoppingMallProductOptionValue.IRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    search: null,
    value: null,
    display_name: null,
    is_active: true,
    order_by: "display_order",
    order_direction: "asc",
  };
  const activeFiltered = await list(activeFilterRequest);
  const expectedActive = createdValues.filter((v) => v.is_active === true);
  TestValidator.equals(
    "is_active true records count",
    activeFiltered.pagination.records,
    expectedActive.length,
  );
  TestValidator.equals(
    "is_active true data length",
    activeFiltered.data.length,
    expectedActive.length,
  );

  // 10. Filter by is_active=false.
  const inactiveFilterRequest: IShoppingMallProductOptionValue.IRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    search: null,
    value: null,
    display_name: null,
    is_active: false,
    order_by: "display_order",
    order_direction: "asc",
  };
  const inactiveFiltered = await list(inactiveFilterRequest);
  const expectedInactive = createdValues.filter((v) => v.is_active === false);
  TestValidator.equals(
    "is_active false records count",
    inactiveFiltered.pagination.records,
    expectedInactive.length,
  );
  TestValidator.equals(
    "is_active false data length",
    inactiveFiltered.data.length,
    expectedInactive.length,
  );

  // 11. is_active=null (explicit) to get both active and inactive.
  const noIsActiveFilterRequest: IShoppingMallProductOptionValue.IRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    search: null,
    value: null,
    display_name: null,
    is_active: null,
    order_by: "display_order",
    order_direction: "asc",
  };
  const noIsActiveFiltered = await list(noIsActiveFilterRequest);
  TestValidator.equals(
    "no is_active filter records count",
    noIsActiveFiltered.pagination.records,
    createdValues.length,
  );
  TestValidator.equals(
    "no is_active filter data length",
    noIsActiveFiltered.data.length,
    createdValues.length,
  );

  // 12. Sorting by display_order desc.
  const sortDisplayOrderDescRequest: IShoppingMallProductOptionValue.IRequest =
    {
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
      search: null,
      value: null,
      display_name: null,
      is_active: null,
      order_by: "display_order",
      order_direction: "desc",
    };
  const sortedByDisplayOrderDesc = await list(sortDisplayOrderDescRequest);

  const createdByDisplayOrderDesc = [...createdValues]
    .sort((a, b) => a.display_order - b.display_order)
    .reverse();
  TestValidator.equals(
    "display_order desc order length",
    sortedByDisplayOrderDesc.data.length,
    createdByDisplayOrderDesc.length,
  );
  for (let i = 0; i < createdByDisplayOrderDesc.length; i++) {
    TestValidator.equals(
      "display_order desc ordering",
      sortedByDisplayOrderDesc.data[i].value,
      createdByDisplayOrderDesc[i].value,
    );
  }

  // 13. Sorting by created_at ascending (default direction) and compare ordering changes.
  const sortCreatedAtRequest: IShoppingMallProductOptionValue.IRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    search: null,
    value: null,
    display_name: null,
    is_active: null,
    order_by: "created_at",
    order_direction: null,
  };
  const sortedByCreatedAt = await list(sortCreatedAtRequest);
  TestValidator.equals(
    "created_at sort records count",
    sortedByCreatedAt.pagination.records,
    createdValues.length,
  );
  TestValidator.equals(
    "created_at sort data length",
    sortedByCreatedAt.data.length,
    createdValues.length,
  );

  // Confirm ordering changed compared to display_order desc ordering.
  const anyDifferentOrder = sortedByCreatedAt.data.some(
    (item, index) =>
      index >= sortedByDisplayOrderDesc.data.length ||
      item.id !== sortedByDisplayOrderDesc.data[index].id,
  );
  TestValidator.predicate(
    "created_at ordering should differ from display_order desc ordering",
    anyDifferentOrder,
  );
}
