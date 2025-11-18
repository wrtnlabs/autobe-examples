import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
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

/**
 * Validate retrieval of full catalog visibility rule details by admin.
 *
 * Business flow:
 *
 * 1. Admin joins and becomes authenticated.
 * 2. Seller joins and becomes authenticated.
 * 3. Admin creates an inventory state for SKUs.
 * 4. Seller creates a product.
 * 5. Admin creates a category and links the product.
 * 6. Seller creates a SKU under the product using the inventory state.
 * 7. Admin creates a catalog visibility rule scoped to seller, product and SKU.
 * 8. Admin fetches the rule by id using GET
 *    /shoppingMall/admin/catalogVisibilityRules/{catalogVisibilityRuleId}.
 * 9. Test asserts that the fetched rule matches the created rule payload and
 *    invariants (matching id, key fields, timestamps present, and deleted_at is
 *    null).
 */
export async function test_api_catalog_visibility_rule_detail_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins (also authenticates and sets Authorization header)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(16);

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://admin.shoppingmall.test/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoinOutput: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoinOutput);

  // 2. Seller joins and logs in
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword: string & tags.Format<"password"> =
    RandomGenerator.alphaNumeric(16) as string & tags.Format<"password">;

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.shoppingmall.test/join",
    referrer: "https://seller.shoppingmall.test/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerJoinOutput: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoinOutput);

  // Ensure seller is authenticated (join has already set header);
  // perform an explicit login to simulate real flow and ensure token rotation.
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.shoppingmall.test/login",
    referrer: "https://seller.shoppingmall.test/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoginOutput: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginOutput);

  // 3. Admin: create inventory state
  // Switch back to admin
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.shoppingmall.test/login",
    referrer: "https://admin.shoppingmall.test/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoginOutput: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginOutput);

  const skuInventoryStateCreateBody = {
    code: `in_stock_${RandomGenerator.alphabets(8)}`,
    name: "In Stock",
    description: "Standard in-stock state for testing",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const skuInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateCreateBody,
      },
    );
  typia.assert(skuInventoryState);

  // 4. Seller: create product
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: null,
      href: "https://seller.shoppingmall.test/login",
      referrer: "https://seller.shoppingmall.test/landing",
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const productCreateBody = {
    code: `P-${RandomGenerator.alphaNumeric(10)}`,
    title: RandomGenerator.name(3),
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "AutoBE-Test-Brand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri: "https://cdn.shoppingmall.test/images/product-main.jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 5. Admin: create category and link product to category
  await api.functional.auth.admin.login(connection, {
    body: adminLoginBody,
  });

  const categoryCreateBody = {
    parent_id: null,
    slug: `test-category-${RandomGenerator.alphaNumeric(8)}`,
    name_en: "Test Category",
    description_en: "Category for catalog visibility rule E2E test",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  const productCategoryCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryCreateBody,
      },
    );
  typia.assert(productCategory);

  // 6. Seller: create SKU under product using inventory state
  await api.functional.auth.seller.login(connection, {
    body: sellerLoginBody,
  });

  const skuCreateBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
    barcode: RandomGenerator.alphaNumeric(13),
    status: "active",
    price: 100,
    original_price: 120,
    inventory_quantity: 50 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 7. Admin: create catalog visibility rule scoped to seller, product, and SKU
  await api.functional.auth.admin.login(connection, {
    body: adminLoginBody,
  });

  const now = new Date();
  const startsAt = now.toISOString();
  const endsAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const visibilityRuleCreateBody = {
    rule_type: "hide",
    actor_type: "customer",
    region_code: "KR",
    enabled: true,
    starts_at: startsAt,
    ends_at: endsAt,
    reason: "E2E test visibility rule for a specific SKU",
    shopping_mall_seller_id: sellerJoinOutput.id,
    shopping_mall_product_id: product.id,
    shopping_mall_sku_id: sku.id,
  } satisfies IShoppingMallCatalogVisibilityRule.ICreate;

  const createdRule: IShoppingMallCatalogVisibilityRule =
    await api.functional.shoppingMall.admin.catalogVisibilityRules.create(
      connection,
      {
        body: visibilityRuleCreateBody,
      },
    );
  typia.assert(createdRule);

  // Basic invariants on created rule
  TestValidator.predicate(
    "created rule has non-null id",
    createdRule.id.length > 0,
  );
  TestValidator.equals(
    "created rule_type matches payload",
    createdRule.rule_type,
    visibilityRuleCreateBody.rule_type,
  );
  TestValidator.equals(
    "created actor_type matches payload",
    createdRule.actor_type,
    visibilityRuleCreateBody.actor_type,
  );
  TestValidator.equals(
    "created region_code matches payload",
    createdRule.region_code,
    visibilityRuleCreateBody.region_code,
  );
  TestValidator.equals(
    "created enabled matches payload",
    createdRule.enabled,
    visibilityRuleCreateBody.enabled,
  );
  TestValidator.equals(
    "created starts_at matches payload",
    createdRule.starts_at,
    visibilityRuleCreateBody.starts_at,
  );
  TestValidator.equals(
    "created ends_at matches payload",
    createdRule.ends_at,
    visibilityRuleCreateBody.ends_at,
  );
  TestValidator.equals(
    "created reason matches payload",
    createdRule.reason,
    visibilityRuleCreateBody.reason,
  );
  TestValidator.equals(
    "created seller scope matches payload",
    createdRule.shopping_mall_seller_id,
    visibilityRuleCreateBody.shopping_mall_seller_id,
  );
  TestValidator.equals(
    "created product scope matches payload",
    createdRule.shopping_mall_product_id,
    visibilityRuleCreateBody.shopping_mall_product_id,
  );
  TestValidator.equals(
    "created sku scope matches payload",
    createdRule.shopping_mall_sku_id,
    visibilityRuleCreateBody.shopping_mall_sku_id,
  );

  // 8. Fetch rule by id via GET endpoint
  const fetchedRule: IShoppingMallCatalogVisibilityRule =
    await api.functional.shoppingMall.admin.catalogVisibilityRules.at(
      connection,
      {
        catalogVisibilityRuleId: createdRule.id as string & tags.Format<"uuid">,
      },
    );
  typia.assert(fetchedRule);

  // 9. Validate that fetched rule matches created rule and invariants
  TestValidator.equals(
    "fetched rule id equals created rule id",
    fetchedRule.id,
    createdRule.id,
  );
  TestValidator.equals(
    "fetched rule_type matches created",
    fetchedRule.rule_type,
    createdRule.rule_type,
  );
  TestValidator.equals(
    "fetched actor_type matches created",
    fetchedRule.actor_type,
    createdRule.actor_type,
  );
  TestValidator.equals(
    "fetched region_code matches created",
    fetchedRule.region_code,
    createdRule.region_code,
  );
  TestValidator.equals(
    "fetched enabled matches created",
    fetchedRule.enabled,
    createdRule.enabled,
  );
  TestValidator.equals(
    "fetched starts_at matches created",
    fetchedRule.starts_at,
    createdRule.starts_at,
  );
  TestValidator.equals(
    "fetched ends_at matches created",
    fetchedRule.ends_at,
    createdRule.ends_at,
  );
  TestValidator.equals(
    "fetched reason matches created",
    fetchedRule.reason,
    createdRule.reason,
  );
  TestValidator.equals(
    "fetched seller scope matches created",
    fetchedRule.shopping_mall_seller_id,
    createdRule.shopping_mall_seller_id,
  );
  TestValidator.equals(
    "fetched product scope matches created",
    fetchedRule.shopping_mall_product_id,
    createdRule.shopping_mall_product_id,
  );
  TestValidator.equals(
    "fetched sku scope matches created",
    fetchedRule.shopping_mall_sku_id,
    createdRule.shopping_mall_sku_id,
  );

  // Admin summary should be present and match admin id
  TestValidator.predicate(
    "fetched rule admin summary is present",
    fetchedRule.admin !== undefined,
  );
  if (fetchedRule.admin !== undefined) {
    TestValidator.equals(
      "fetched rule admin summary id matches admin",
      fetchedRule.admin.id,
      adminJoinOutput.id,
    );
  }

  // Confirm created_at and updated_at are present and deleted_at is null
  TestValidator.predicate(
    "fetched rule created_at is non-empty",
    fetchedRule.created_at.length > 0,
  );
  TestValidator.predicate(
    "fetched rule updated_at is non-empty",
    fetchedRule.updated_at.length > 0,
  );
  TestValidator.equals(
    "fetched rule deleted_at is null (active rule)",
    fetchedRule.deleted_at ?? null,
    null,
  );
}
