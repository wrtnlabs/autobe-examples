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
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

/**
 * Ensure catalog search respects hide-type visibility rules.
 *
 * Scenario:
 *
 * 1. Register a seller and auto-authenticate.
 * 2. As the seller, create two active products whose titles both contain a shared
 *    keyword (e.g. "Basic T-Shirt" and "Premium T-Shirt").
 * 3. Register an admin, log in as the admin, and create a purchasable SKU
 *    inventory state.
 * 4. Switch back to the seller and create one active, in-stock SKU for each
 *    product using the created inventory state.
 * 5. Call PATCH /shoppingMall/catalogSearch with a query matching the shared
 *    keyword and broad filters; assert that both products appear in the search
 *    results.
 * 6. Log in again as the admin and create a catalog visibility rule with
 *    rule_type="hide", enabled=true, scoped to the second product.
 * 7. Run the same search again and assert that:
 *
 *    - The first product still appears; and
 *    - The second, hidden product no longer appears in the results.
 *
 * This validates that catalogSearch respects active hide-type visibility rules
 * at search time, without manually manipulating connection headers.
 */
export async function test_api_catalog_search_respects_visibility_hide_rules(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins and auto-authenticates
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  const sellerEmail: string & tags.Format<"email"> = seller.email;

  // 2. Create two products with titles containing a shared keyword
  const sharedKeyword = "T-Shirt";

  const product1Body = {
    code: RandomGenerator.alphaNumeric(8),
    title: `Basic ${sharedKeyword}`,
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: null,
    model_name: null,
    status: "active",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product1: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: product1Body,
    });
  typia.assert(product1);

  const product2Body = {
    code: RandomGenerator.alphaNumeric(8),
    title: `Premium ${sharedKeyword}`,
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: null,
    model_name: null,
    status: "active",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product2: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: product2Body,
    });
  typia.assert(product2);

  // 3. Admin joins and logs in, then creates an inventory state
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoin);

  const adminEmail: string & tags.Format<"email"> = adminJoin.email;

  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  const inventoryStateBody = {
    code: `in_stock_${RandomGenerator.alphaNumeric(6)}`,
    name: "In Stock",
    description: "Purchasable state for catalog search tests",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: inventoryStateBody,
      },
    );
  typia.assert(inventoryState);

  // 4. Switch back to seller and create one SKU per product using this inventory state
  const sellerLoginBody = {
    email: sellerEmail,
    password: adminJoinBody.password satisfies string as string,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  const sku1Body = {
    code: RandomGenerator.alphaNumeric(10),
    barcode: null,
    status: "active",
    price: 19900,
    original_price: null,
    inventory_quantity: 10,
    low_stock_threshold: 1,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku1: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product1.id,
      body: sku1Body,
    });
  typia.assert(sku1);

  const sku2Body = {
    code: RandomGenerator.alphaNumeric(10),
    barcode: null,
    status: "active",
    price: 29900,
    original_price: null,
    inventory_quantity: 10,
    low_stock_threshold: 1,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku2: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product2.id,
      body: sku2Body,
    });
  typia.assert(sku2);

  // 5. Baseline search with no visibility rules; expect both products present
  const baselineSearchBody = {
    query: sharedKeyword,
    categoryIds: undefined,
    tagIds: undefined,
    sellerIds: undefined,
    minPrice: undefined,
    maxPrice: undefined,
    onlyInStock: true,
    attributeFilters: undefined,
    sort: {
      field: "relevance",
      direction: "desc",
    },
    page: 1,
    pageSize: 50,
    locale: "en-US",
    regionCode: "KR",
  } satisfies IShoppingMallCatalogSearchIndexEntry.IRequest;

  const baselinePage: IPageIShoppingMallCatalogSearchIndexEntry.ISummary =
    await api.functional.shoppingMall.catalogSearch.index(connection, {
      body: baselineSearchBody,
    });
  typia.assert(baselinePage);

  const productIdsInBaseline: string[] = baselinePage.data
    .filter((entry) => entry.product !== undefined)
    .map((entry) => entry.product!.id);

  TestValidator.predicate(
    "baseline search should contain first product",
    productIdsInBaseline.includes(product1.id),
  );
  TestValidator.predicate(
    "baseline search should contain second product",
    productIdsInBaseline.includes(product2.id),
  );

  // 6. Switch to admin and create a hide rule targeting product2
  const adminReLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login2",
    referrer: "https://admin.example.com/landing2",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminReLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminReLoginBody,
    });
  typia.assert(adminReLogin);

  const visibilityRuleBody = {
    rule_type: "hide",
    actor_type: null,
    region_code: null,
    enabled: true,
    starts_at: null,
    ends_at: null,
    reason: "Hide product2 for all actors",
    shopping_mall_seller_id: null,
    shopping_mall_product_id: product2.id,
    shopping_mall_sku_id: null,
  } satisfies IShoppingMallCatalogVisibilityRule.ICreate;

  const rule: IShoppingMallCatalogVisibilityRule =
    await api.functional.shoppingMall.admin.catalogVisibilityRules.create(
      connection,
      {
        body: visibilityRuleBody,
      },
    );
  typia.assert(rule);

  // 7. Re-run the same catalog search and assert hidden product is excluded
  const filteredPage: IPageIShoppingMallCatalogSearchIndexEntry.ISummary =
    await api.functional.shoppingMall.catalogSearch.index(connection, {
      body: baselineSearchBody,
    });
  typia.assert(filteredPage);

  const filteredProductIds: string[] = filteredPage.data
    .filter((entry) => entry.product !== undefined)
    .map((entry) => entry.product!.id);

  TestValidator.predicate(
    "filtered search should still contain visible product1",
    filteredProductIds.includes(product1.id),
  );
  TestValidator.predicate(
    "filtered search should not contain hidden product2",
    filteredProductIds.includes(product2.id) === false,
  );
}
