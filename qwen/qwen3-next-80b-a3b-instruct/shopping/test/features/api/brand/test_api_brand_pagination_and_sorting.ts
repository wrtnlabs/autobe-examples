import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductBrand";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductBrand";
import { prepare_random_shopping_mall_product_brand } from "../../../prepare/prepare_random_shopping_mall_product_brand";
import { generate_random_shopping_mall_admin_brands_create } from "../../../generate/generate_random_shopping_mall_admin_brands_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_brand_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin to access brand search functionality
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join", // required uri format
      referrer: "https://example.com/admin/signup", // required uri format
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: Create a large dataset of 50+ brands with varying product counts
  const brandCount = 60; // Ensure meaningful pagination
  const brands: IShoppingMallProductBrand[] = [];
  const createdBrands = await ArrayUtil.asyncRepeat(
    brandCount,
    async (index) => {
      // Create brand with varying product counts from 0 to 50
      const productCount = index % 51; // 0 through 50
      // Create brand with varying names in alphabetical order for testing name sorting
      // Create varying dates for createdAt sorting
      const createdDate = new Date(2024, 0, index + 1); // Jan 1 to Jan 60
      // Use generator function to create brand with appropriate data
      return await generate_random_shopping_mall_admin_brands_create(
        adminConnection,
        {
          body: {
            name: `Brand ${String.fromCharCode(65 + (index % 26))}-${index}`, // Generates Brand A-0, Brand B-1, etc.
          } satisfies IShoppingMallProductBrand.ICreate,
        },
      );
    },
  );
  // Step 3: Verify we have the correct number of created brands
  typia.assert(createdBrands);
  TestValidator.equals("created 60 brands", createdBrands.length, brandCount);
  // Step 4: Test pagination with different limit sizes (1-100 limit constraint)
  const limitOptions = [1, 5, 10, 20, 50, 100];
  for (const limit of limitOptions) {
    const response = await api.functional.shoppingMall.brands.index(
      adminConnection,
      {
        body: {
          limit: limit, // Valid limit 1-100
        } satisfies IShoppingMallProductBrand.IRequest,
      },
    );
    typia.assert(response);
    // Validate pagination metadata
    TestValidator.equals(
      `limit ${limit} pagination limit`,
      response.pagination.limit,
      limit,
    );
    TestValidator.equals(
      `limit ${limit} pagination records`,
      response.pagination.records,
      brandCount,
    );
    TestValidator.equals(
      `limit ${limit} pagination pages`,
      response.pagination.pages,
      Math.ceil(brandCount / limit),
    );
    TestValidator.equals(
      `limit ${limit} pagination current`,
      response.pagination.current,
      1,
    );
    TestValidator.equals(
      `limit ${limit} data items`,
      response.data.length,
      Math.min(limit, brandCount),
    );
  }
  // Step 5: Test pagination with page navigation
  const pageLimit = 10;
  const totalPages = Math.ceil(brandCount / pageLimit);
  for (let page = 1; page <= totalPages; page++) {
    const response = await api.functional.shoppingMall.brands.index(
      adminConnection,
      {
        body: {
          limit: pageLimit,
          page: page,
        } satisfies IShoppingMallProductBrand.IRequest,
      },
    );
    typia.assert(response);
    // Validate pagination metadata
    TestValidator.equals(
      `page ${page} pagination limit`,
      response.pagination.limit,
      pageLimit,
    );
    TestValidator.equals(
      `page ${page} pagination records`,
      response.pagination.records,
      brandCount,
    );
    TestValidator.equals(
      `page ${page} pagination pages`,
      response.pagination.pages,
      totalPages,
    );
    TestValidator.equals(
      `page ${page} pagination current`,
      response.pagination.current,
      page,
    );
    // Validate data items for this page
    const expectedItemCount =
      page === totalPages ? brandCount % pageLimit || pageLimit : pageLimit;
    TestValidator.equals(
      `page ${page} data items`,
      response.data.length,
      expectedItemCount,
    );
  }
  // Step 6: Test sorting by name (alphabetical ascending)
  const responseByNameAsc = await api.functional.shoppingMall.brands.index(
    adminConnection,
    {
      body: {
        sortBy: "name",
        sortOrder: "asc",
      } satisfies IShoppingMallProductBrand.IRequest,
    },
  );
  typia.assert(responseByNameAsc);
  TestValidator.equals(
    "sorted by name ascending",
    responseByNameAsc.data.length,
    brandCount,
  );
  // Validate sorted order: names should be in alphabetical order (Brand A, Brand B, etc.)
  for (let i = 0; i < responseByNameAsc.data.length - 1; i++) {
    const currentName = responseByNameAsc.data[i].name;
    const nextName = responseByNameAsc.data[i + 1].name;
    TestValidator.predicate(
      `name sort: ${currentName} <= ${nextName}`,
      currentName <= nextName,
    );
  }
  // Step 7: Test sorting by name (alphabetical descending)
  const responseByNameDesc = await api.functional.shoppingMall.brands.index(
    adminConnection,
    {
      body: {
        sortBy: "name",
        sortOrder: "desc",
      } satisfies IShoppingMallProductBrand.IRequest,
    },
  );
  typia.assert(responseByNameDesc);
  TestValidator.equals(
    "sorted by name descending",
    responseByNameDesc.data.length,
    brandCount,
  );
  // Validate sorted order: names should be in reverse alphabetical order (Brand Z, Brand Y, etc.)
  for (let i = 0; i < responseByNameDesc.data.length - 1; i++) {
    const currentName = responseByNameDesc.data[i].name;
    const nextName = responseByNameDesc.data[i + 1].name;
    TestValidator.predicate(
      `name reverse sort: ${currentName} >= ${nextName}`,
      currentName >= nextName,
    );
  }
  // Step 8: Test sorting by createdAt (chronological ascending)
  const responseByCreatedAtAsc = await api.functional.shoppingMall.brands.index(
    adminConnection,
    {
      body: {
        sortBy: "createdAt",
        sortOrder: "asc",
      } satisfies IShoppingMallProductBrand.IRequest,
    },
  );
  typia.assert(responseByCreatedAtAsc);
  TestValidator.equals(
    "sorted by createdAt ascending",
    responseByCreatedAtAsc.data.length,
    brandCount,
  );
  // Validate sorted order: dates should be in chronological order (oldest first)
  for (let i = 0; i < responseByCreatedAtAsc.data.length - 1; i++) {
    const currentDate = new Date(responseByCreatedAtAsc.data[i].created_at);
    const nextDate = new Date(responseByCreatedAtAsc.data[i + 1].created_at);
    TestValidator.predicate(
      `createdAt sort: ${currentDate} <= ${nextDate}`,
      currentDate <= nextDate,
    );
  }
  // Step 9: Test sorting by createdAt (chronological descending)
  const responseByCreatedAtDesc =
    await api.functional.shoppingMall.brands.index(adminConnection, {
      body: {
        sortBy: "createdAt",
        sortOrder: "desc",
      } satisfies IShoppingMallProductBrand.IRequest,
    });
  typia.assert(responseByCreatedAtDesc);
  TestValidator.equals(
    "sorted by createdAt descending",
    responseByCreatedAtDesc.data.length,
    brandCount,
  );
  // Validate sorted order: dates should be in reverse chronological order (newest first)
  for (let i = 0; i < responseByCreatedAtDesc.data.length - 1; i++) {
    const currentDate = new Date(responseByCreatedAtDesc.data[i].created_at);
    const nextDate = new Date(responseByCreatedAtDesc.data[i + 1].created_at);
    TestValidator.predicate(
      `createdAt reverse sort: ${currentDate} >= ${nextDate}`,
      currentDate >= nextDate,
    );
  }
  // Step 10: Test sorting by productCount (descending) - Most products first
  // Note: productCount is a computed field in ISummary - we're verifying the API correctly sorts by this value
  const responseByProductCountDesc =
    await api.functional.shoppingMall.brands.index(adminConnection, {
      body: {
        sortBy: "productCount",
        sortOrder: "desc",
      } satisfies IShoppingMallProductBrand.IRequest,
    });
  typia.assert(responseByProductCountDesc);
  TestValidator.equals(
    "sorted by productCount descending",
    responseByProductCountDesc.data.length,
    brandCount,
  );
  // Validate sorted order: product counts should be in descending order (highest first)
  for (let i = 0; i < responseByProductCountDesc.data.length - 1; i++) {
    const currentCount = responseByProductCountDesc.data[i].product_count;
    const nextCount = responseByProductCountDesc.data[i + 1].product_count;
    TestValidator.predicate(
      `productCount sort: ${currentCount} >= ${nextCount}`,
      currentCount >= nextCount,
    );
  }
  // Step 11: Test sorting by productCount (ascending) - Least products first
  const responseByProductCountAsc =
    await api.functional.shoppingMall.brands.index(adminConnection, {
      body: {
        sortBy: "productCount",
        sortOrder: "asc",
      } satisfies IShoppingMallProductBrand.IRequest,
    });
  typia.assert(responseByProductCountAsc);
  TestValidator.equals(
    "sorted by productCount ascending",
    responseByProductCountAsc.data.length,
    brandCount,
  );
  // Validate sorted order: product counts should be in ascending order (lowest first)
  for (let i = 0; i < responseByProductCountAsc.data.length - 1; i++) {
    const currentCount = responseByProductCountAsc.data[i].product_count;
    const nextCount = responseByProductCountAsc.data[i + 1].product_count;
    TestValidator.predicate(
      `productCount asc sort: ${currentCount} <= ${nextCount}`,
      currentCount <= nextCount,
    );
  }
  // Step 12: Test combined pagination and sorting
  const combinedResponse = await api.functional.shoppingMall.brands.index(
    adminConnection,
    {
      body: {
        sortBy: "productCount",
        sortOrder: "desc",
        page: 2,
        limit: 15,
      } satisfies IShoppingMallProductBrand.IRequest,
    },
  );
  typia.assert(combinedResponse);
  // Validate pagination
  TestValidator.equals(
    "combined pagination limit",
    combinedResponse.pagination.limit,
    15,
  );
  TestValidator.equals(
    "combined pagination current",
    combinedResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "combined pagination pages",
    combinedResponse.pagination.pages,
    Math.ceil(brandCount / 15),
  );
  // Validate data size
  TestValidator.equals("combined data items", combinedResponse.data.length, 15);
  // Validate sorting within this page
  for (let i = 0; i < combinedResponse.data.length - 1; i++) {
    const currentCount = combinedResponse.data[i].product_count;
    const nextCount = combinedResponse.data[i + 1].product_count;
    TestValidator.predicate(
      `combined sort: ${currentCount} >= ${nextCount}`,
      currentCount >= nextCount,
    );
  }
}
