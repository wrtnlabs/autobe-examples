import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCatalogVisibilityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCatalogVisibilityRule";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCatalogVisibilityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogVisibilityRule";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

export async function test_api_catalog_visibility_rule_search_by_actor_and_region_filters(
  connection: api.IConnection,
) {
  // 1. Admin join (and implicitly authenticate)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Seller join (and implicitly authenticate)
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://seller.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 3. Create SKU inventory state as admin (after switching back to admin)
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminJoinBody.password,
      ip: null,
      href: "https://admin.shoppingmall.test/login",
      referrer: "https://shoppingmall.test/landing",
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const inventoryStateBody = {
    code: `state-${RandomGenerator.alphaNumeric(8)}`,
    name: "In Stock",
    description: "Purchasable stock state for testing",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      { body: inventoryStateBody },
    );
  typia.assert(inventoryState);

  // 4. Switch to seller and create product
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerJoinBody.password,
      ip: null,
      href: "https://seller.shoppingmall.test/login",
      referrer: "https://shoppingmall.test/landing",
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const productCode = `P-${RandomGenerator.alphaNumeric(10)}`;
  const productBody = {
    code: productCode,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri: "https://cdn.shoppingmall.test/images/product.png",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 5. Create SKU for the product
  const skuBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
    barcode: null,
    status: "active",
    price: 199.99,
    original_price: 249.99,
    inventory_quantity: 100,
    low_stock_threshold: 5,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuBody,
    });
  typia.assert(sku);

  // 6. Switch back to admin to create country and region
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminJoinBody.password,
      ip: null,
      href: "https://admin.shoppingmall.test/login2",
      referrer: "https://shoppingmall.test/landing",
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const countryCode = `C-${RandomGenerator.alphaNumeric(5)}`;
  const countryBody = {
    country_code: countryCode,
    name_en: "Test Country",
    phone_code: "+99",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBody,
    });
  typia.assert(country);

  const regionCode = `R-${RandomGenerator.alphaNumeric(5)}`;
  const regionBody = {
    code: regionCode,
    name_en: "Test Region",
    region_type: "state",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallRegion.ICreate;

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionBody,
      },
    );
  typia.assert(region);

  // 7. Create target catalog visibility rule: actor_type=customer, region_code=region.code, enabled=true
  const targetRuleBody = {
    rule_type: "hide",
    actor_type: "customer",
    region_code: region.code,
    enabled: true,
    starts_at: null,
    ends_at: null,
    reason: "Target rule for customer in region",
    shopping_mall_seller_id: null,
    shopping_mall_product_id: product.id,
    shopping_mall_sku_id: sku.id,
  } satisfies IShoppingMallCatalogVisibilityRule.ICreate;

  const targetRule: IShoppingMallCatalogVisibilityRule =
    await api.functional.shoppingMall.admin.catalogVisibilityRules.create(
      connection,
      { body: targetRuleBody },
    );
  typia.assert(targetRule);

  // 8. Create control rule with mismatching actor_type but same region_code
  const controlRuleBody = {
    rule_type: "hide",
    actor_type: "seller", // different actor_type
    region_code: region.code,
    enabled: true,
    starts_at: null,
    ends_at: null,
    reason: "Control rule with different actor_type",
    shopping_mall_seller_id: null,
    shopping_mall_product_id: product.id,
    shopping_mall_sku_id: sku.id,
  } satisfies IShoppingMallCatalogVisibilityRule.ICreate;

  const controlRule: IShoppingMallCatalogVisibilityRule =
    await api.functional.shoppingMall.admin.catalogVisibilityRules.create(
      connection,
      { body: controlRuleBody },
    );
  typia.assert(controlRule);

  // 9. Search catalog visibility rules with actor_type=customer and region_code=region.code and enabled=true
  const searchBody = {
    page: 0,
    limit: 20,
    enabled: true,
    rule_type: null,
    actor_type: "customer",
    region_code: region.code,
    shopping_mall_seller_id: null,
    shopping_mall_product_id: null,
    shopping_mall_sku_id: null,
    starts_at_from: null,
    starts_at_to: null,
    ends_at_from: null,
    ends_at_to: null,
    reason_query: null,
  } satisfies IShoppingMallCatalogVisibilityRule.IRequest;

  const pageResult: IPageIShoppingMallCatalogVisibilityRule.ISummary =
    await api.functional.shoppingMall.admin.catalogVisibilityRules.index(
      connection,
      { body: searchBody },
    );
  typia.assert(pageResult);

  const pagination: IPage.IPagination = pageResult.pagination;
  typia.assert(pagination);

  const rules = pageResult.data;

  // 10. Business validations
  // 10-1. Ensure at least one rule is returned and includes the target rule
  TestValidator.predicate(
    "at least one rule returned for customer and region filter",
    rules.length > 0,
  );

  const foundTarget = rules.some((rule) => rule.id === targetRule.id);
  TestValidator.predicate(
    "search results contain the target customer-region rule",
    foundTarget,
  );

  const foundControl = rules.some((rule) => rule.id === controlRule.id);
  TestValidator.predicate(
    "search results do not contain the control rule with different actor_type",
    foundControl === false,
  );

  // 10-2. Validate every returned rule matches actor_type and region_code filters
  for (const rule of rules) {
    TestValidator.equals(
      "every rule has actor_type matching filter",
      rule.actor_type,
      "customer",
    );
    TestValidator.equals(
      "every rule has region_code matching filter",
      rule.region_code,
      region.code,
    );
    TestValidator.predicate(
      "every rule is enabled when filtering with enabled=true",
      rule.enabled === true,
    );
  }

  // 10-3. Pagination metadata consistency
  TestValidator.predicate(
    "pagination limit is respected",
    rules.length <= pagination.limit,
  );
  TestValidator.predicate(
    "pagination records is at least the number of returned rules",
    pagination.records >= rules.length,
  );
}
