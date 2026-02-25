import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_product_list_filtered_sorted(
  connection: api.IConnection,
) {
  // 1. Seller joins and gets authorized
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SellerPass1234",
      shopName: RandomGenerator.name(2),
      shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
      logoUri: null,
    },
  });
  typia.assert(sellerAuthorized);
  // Set up a seller-specific connection with bearer token
  const sellerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${sellerAuthorized.token.access}`,
    },
  };
  // Prepare filter parameters
  const searchKeyword = RandomGenerator.substring(sellerAuthorized.shopName);
  const sellerId = sellerAuthorized.id;
  // To filter category and subcategory, fetch products list first to find category and subcategory
  // We simulate that by searching products without filter to get existing category and subcategory
  const initialList = await api.functional.shoppingMall.seller.products.index(
    sellerConnection,
    {
      body: { sellerId },
    },
  );
  typia.assert(initialList);
  const categories = initialList.data.map((p) => p.productSubcategory.category);
  const uniqueCategories = Array.from(new Set(categories.map((c) => c.id))).map(
    (id) => categories.find((c) => c.id === id)!,
  );
  if (uniqueCategories.length === 0) {
    // No categories found, skip other filters
    return;
  }
  const selectedCategory = RandomGenerator.pick(uniqueCategories);
  const subcategories = initialList.data
    .filter((p) => p.productSubcategory.category.id === selectedCategory.id)
    .map((p) => p.productSubcategory);
  const uniqueSubcategories = Array.from(
    new Set(subcategories.map((s) => s.id)),
  ).map((id) => subcategories.find((s) => s.id === id)!);
  const selectedSubcategory =
    uniqueSubcategories.length > 0
      ? RandomGenerator.pick(uniqueSubcategories)
      : null;
  // Define price range filter for the query
  const priceMin = 0;
  const priceMax = 1000000;
  // Prepare filter body with all filters and sort criteria
  const filterBody = {
    search: searchKeyword !== "" ? searchKeyword : undefined,
    sellerId: sellerId,
    productCategoryId: selectedCategory.id,
    productSubcategoryId: selectedSubcategory?.id ?? undefined,
    priceMin: priceMin !== 0 ? priceMin : undefined,
    priceMax: priceMax, // removed invalid conditional
    page: 1,
    limit: 50,
    sort: "base_price_asc" as const,
  } satisfies IShoppingMallProduct.IRequest;
  // Call index API with filters
  const filteredList = await api.functional.shoppingMall.seller.products.index(
    sellerConnection,
    {
      body: filterBody,
    },
  );
  typia.assert(filteredList);
  // Validate pagination and data
  TestValidator.predicate(
    "pagination current page valid",
    filteredList.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit valid",
    filteredList.pagination.limit === 50,
  );
  TestValidator.predicate(
    "pagination pages valid",
    filteredList.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records valid",
    filteredList.pagination.records >= 0,
  );
  // Validate each product matches filter criteria
  for (const product of filteredList.data) {
    // Must belong to seller
    TestValidator.equals(
      "product sellerId matches",
      product.seller.id,
      sellerId,
    );
    // Must belong to category
    TestValidator.equals(
      "product category matches",
      product.productSubcategory.category.id,
      selectedCategory.id,
    );
    // Must belong to subcategory if filter applied
    if (selectedSubcategory !== null) {
      TestValidator.equals(
        "product subcategory matches",
        product.productSubcategory.id,
        selectedSubcategory.id,
      );
    }
    // Base price must be in range
    TestValidator.predicate(
      "product basePrice in min-max range",
      product.basePrice >= priceMin && product.basePrice <= priceMax,
    );
  }
  // Validate sorting: base_price ascending
  for (let i = 1; i < filteredList.data.length; ++i) {
    TestValidator.predicate(
      "basePrice sorted ascending",
      filteredList.data[i - 1].basePrice <= filteredList.data[i].basePrice,
    );
  }
}
