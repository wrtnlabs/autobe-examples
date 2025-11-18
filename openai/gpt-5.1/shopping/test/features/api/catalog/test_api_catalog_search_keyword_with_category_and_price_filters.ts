import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCatalogSearchIndexEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCatalogSearchIndexEntry";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCatalogSearchAttributeFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogSearchAttributeFilter";
import type { IShoppingMallCatalogSearchIndexEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogSearchIndexEntry";
import type { IShoppingMallCatalogSearchSort } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogSearchSort";
import type { IShoppingMallCatalogVisibilityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogVisibilityRule";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

export async function test_api_catalog_search_keyword_with_category_and_price_filters(
  connection: api.IConnection,
) {
  // 1. Seller join
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  // 2. Create two products as the seller
  const productKeyword = "Running Shoe";

  const matchingProductBody = {
    code: RandomGenerator.alphaNumeric(10),
    title: `${productKeyword} ${RandomGenerator.paragraph({ sentences: 1 })}`,
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "BrandA",
    model_name: "Model-RUN-1",
    status: "active",
    primary_image_uri:
      "https://cdn.example.com/images/running-shoe.jpg" as string &
        tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const matchingProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: matchingProductBody,
    });
  typia.assert(matchingProduct);

  const nonMatchingProductBody = {
    code: RandomGenerator.alphaNumeric(10),
    title: `Casual Sandal ${RandomGenerator.paragraph({ sentences: 1 })}`,
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    brand: "BrandB",
    model_name: "Model-SANDAL-1",
    status: "active",
    primary_image_uri: "https://cdn.example.com/images/sandal.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const nonMatchingProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: nonMatchingProductBody,
    });
  typia.assert(nonMatchingProduct);

  // 3. Admin join
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12) as string &
    tags.Format<"password">;

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 4. Admin creates a category
  const categoryBody = {
    parent_id: null,
    slug: `running-${RandomGenerator.alphaNumeric(6)}`,
    name_en: "Running Shoes",
    description_en: "Category for running footwear",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // 5. Link matching product to category (admin scope already active)
  const productCategoryBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: matchingProduct.id,
        body: productCategoryBody,
      },
    );
  typia.assert(productCategory);

  // 6. Create purchasable inventory state
  const skuInventoryStateBody = {
    code: `in_stock_${RandomGenerator.alphaNumeric(4)}`,
    name: "In Stock",
    description: "Purchasable in-stock state",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateBody,
      },
    );
  typia.assert(inventoryState);

  // 7. Ensure seller is authenticated again (admin.join changed token)
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/login-page",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerAuthorizedAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerAuthorizedAgain);

  // 8. Create two SKUs for both products
  const matchingSkuPrice = 50000 as number & tags.Minimum<0>;
  const nonMatchingSkuPrice = 150000 as number & tags.Minimum<0>;

  const matchingSkuBody = {
    code: `RUNSKU-${RandomGenerator.alphaNumeric(6)}`,
    barcode: null,
    status: "active",
    price: matchingSkuPrice,
    original_price: matchingSkuPrice,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const matchingSku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: matchingProduct.id as string & tags.Format<"uuid">,
      body: matchingSkuBody,
    });
  typia.assert(matchingSku);

  const nonMatchingSkuBody = {
    code: `SANDSKU-${RandomGenerator.alphaNumeric(6)}`,
    barcode: null,
    status: "active",
    price: nonMatchingSkuPrice,
    original_price: nonMatchingSkuPrice,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const nonMatchingSku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: nonMatchingProduct.id as string & tags.Format<"uuid">,
      body: nonMatchingSkuBody,
    });
  typia.assert(nonMatchingSku);

  // 9. Switch to admin again to create visibility rule hiding the non-matching SKU
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/login-page",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminAuthorizedAgain: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedAgain);

  const visibilityRuleBody = {
    rule_type: "hide",
    actor_type: null,
    region_code: null,
    enabled: true,
    starts_at: null,
    ends_at: null,
    reason: "Hide non-matching SKU from catalog search",
    shopping_mall_seller_id: null,
    shopping_mall_product_id: null,
    shopping_mall_sku_id: nonMatchingSku.id,
  } satisfies IShoppingMallCatalogVisibilityRule.ICreate;

  const visibilityRule: IShoppingMallCatalogVisibilityRule =
    await api.functional.shoppingMall.admin.catalogVisibilityRules.create(
      connection,
      {
        body: visibilityRuleBody,
      },
    );
  typia.assert(visibilityRule);

  // 10. Build unauthenticated connection for public search
  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 11. Perform catalog search
  const minPrice = 40000 as number & tags.Minimum<0>;
  const maxPrice = 60000 as number & tags.Minimum<0>;

  const searchBody = {
    query: "running",
    categoryIds: [category.id],
    tagIds: undefined,
    sellerIds: undefined,
    minPrice,
    maxPrice,
    onlyInStock: true,
    attributeFilters: undefined,
    sort: {
      field: "relevance",
      direction: "desc",
    } satisfies IShoppingMallCatalogSearchSort,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    locale: "en-US",
    regionCode: "KR",
  } satisfies IShoppingMallCatalogSearchIndexEntry.IRequest;

  const page: IPageIShoppingMallCatalogSearchIndexEntry.ISummary =
    await api.functional.shoppingMall.catalogSearch.index(publicConnection, {
      body: searchBody,
    });
  typia.assert(page);

  const pagination: IPage.IPagination = page.pagination;
  typia.assert(pagination);

  // 12. Business assertions on search results
  TestValidator.predicate(
    "pagination has at least one record",
    pagination.records >= 1,
  );

  TestValidator.predicate("data length is at least one", page.data.length >= 1);

  const hasMatchingProduct = page.data.some((entry) => {
    return (
      entry.product !== undefined && entry.product.id === matchingProduct.id
    );
  });

  TestValidator.predicate(
    "search results contain matching product",
    hasMatchingProduct,
  );

  const hasNonMatchingProduct = page.data.some((entry) => {
    return (
      entry.product !== undefined && entry.product.id === nonMatchingProduct.id
    );
  });

  TestValidator.predicate(
    "search results do not contain non-matching product",
    hasNonMatchingProduct === false,
  );

  const hasEntryWithMatchingSku = page.data.some((entry) => {
    return entry.sku !== undefined && entry.sku.id === matchingSku.id;
  });

  TestValidator.predicate(
    "search results contain matching SKU",
    hasEntryWithMatchingSku,
  );

  const hasEntryWithNonMatchingSku = page.data.some((entry) => {
    return entry.sku !== undefined && entry.sku.id === nonMatchingSku.id;
  });

  TestValidator.predicate(
    "search results do not contain hidden non-matching SKU",
    hasEntryWithNonMatchingSku === false,
  );
}
