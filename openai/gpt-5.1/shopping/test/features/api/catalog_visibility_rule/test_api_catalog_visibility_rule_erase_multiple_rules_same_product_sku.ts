import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
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
 * Validate that erasing one of multiple catalog visibility rules targeting the
 * same product/SKU only removes the specified rule and does not affect other
 * rules.
 *
 * Business flow:
 *
 * 1. Seller joins and authenticates.
 * 2. Admin joins and authenticates.
 * 3. Seller creates a product.
 * 4. Admin creates a SKU inventory state.
 * 5. Seller creates a SKU for the product referencing the created inventory state.
 * 6. Admin creates two catalog visibility rules scoped to the same product and SKU
 *    but with different rule_type/actor_type combinations.
 * 7. Admin erases only the first catalog visibility rule.
 * 8. Verify that:
 *
 *    - The erase call completes without throwing.
 *    - A subsequent GET for the erased rule id results in an error.
 *    - A GET for the second rule id still succeeds, and the rule remains enabled and
 *         correctly associated to the product and SKU.
 */
export async function test_api_catalog_visibility_rule_erase_multiple_rules_same_product_sku(
  connection: api.IConnection,
) {
  // 1. Seller joins (self-registration) to own product/SKU.
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 2. Admin joins and authenticates.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorizedFromJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorizedFromJoin);

  // Explicit admin login to mirror dependency description and ensure login flow works.
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/login-referrer",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 3. Switch to seller by logging in with seller credentials.
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/login-referrer",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerAuthorizedFromLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorizedFromLogin);

  // 4. Seller creates a product.
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.name(1),
    model_name: RandomGenerator.name(1),
    status: "active",
    primary_image_uri:
      "https://cdn.example.com/images/" +
      RandomGenerator.alphaNumeric(16) +
      ".jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 5. Switch back to admin to create an inventory state.
  const adminAuthorizedAgain: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorizedAgain);

  const inventoryStateCreateBody = {
    code: "in_stock_" + RandomGenerator.alphaNumeric(8),
    name: "In Stock (purchasable)",
    description: "Purchasable inventory state for testing visibility rules.",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: inventoryStateCreateBody,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(inventoryState);

  // 6. Switch to seller again to create a SKU under the product.
  const sellerAuthorizedForSku: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorizedForSku);

  const skuCreateBody = {
    code: "SKU-" + RandomGenerator.alphaNumeric(10),
    barcode: null,
    status: "active",
    price: 19999,
    original_price: 24999,
    inventory_quantity: 100,
    low_stock_threshold: 5,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuCreateBody,
    });
  typia.assert<IShoppingMallSku>(sku);

  // 7. Switch to admin to create two catalog visibility rules for same product/SKU.
  const adminAuthorizedForRules: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorizedForRules);

  const startsAt: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  const rule1CreateBody = {
    rule_type: "hide_guest",
    actor_type: "guestUser",
    region_code: "US",
    enabled: true,
    starts_at: startsAt,
    ends_at: null,
    reason: "Hide product for guests in US for testing.",
    shopping_mall_seller_id: product.shopping_mall_seller_id,
    shopping_mall_product_id: product.id,
    shopping_mall_sku_id: sku.id,
  } satisfies IShoppingMallCatalogVisibilityRule.ICreate;

  const rule1: IShoppingMallCatalogVisibilityRule =
    await api.functional.shoppingMall.admin.catalogVisibilityRules.create(
      connection,
      {
        body: rule1CreateBody,
      },
    );
  typia.assert<IShoppingMallCatalogVisibilityRule>(rule1);

  const rule2CreateBody = {
    rule_type: "region_restricted",
    actor_type: "customer",
    region_code: "US-CA",
    enabled: true,
    starts_at: startsAt,
    ends_at: null,
    reason: "Restrict product visibility to customers in California only.",
    shopping_mall_seller_id: product.shopping_mall_seller_id,
    shopping_mall_product_id: product.id,
    shopping_mall_sku_id: sku.id,
  } satisfies IShoppingMallCatalogVisibilityRule.ICreate;

  const rule2: IShoppingMallCatalogVisibilityRule =
    await api.functional.shoppingMall.admin.catalogVisibilityRules.create(
      connection,
      {
        body: rule2CreateBody,
      },
    );
  typia.assert<IShoppingMallCatalogVisibilityRule>(rule2);

  // Sanity-check that both rules target same product and SKU before deletion.
  TestValidator.equals(
    "rule1 product id matches product.id before delete",
    rule1.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "rule2 product id matches product.id before delete",
    rule2.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "rule1 sku id matches sku.id before delete",
    rule1.shopping_mall_sku_id,
    sku.id,
  );
  TestValidator.equals(
    "rule2 sku id matches sku.id before delete",
    rule2.shopping_mall_sku_id,
    sku.id,
  );

  // 8. Erase only the first rule.
  await api.functional.shoppingMall.admin.catalogVisibilityRules.erase(
    connection,
    {
      catalogVisibilityRuleId: rule1.id,
    },
  );

  // 9. Verify that the erased rule can no longer be retrieved.
  await TestValidator.error(
    "deleted visibility rule should not be retrievable",
    async () => {
      await api.functional.shoppingMall.admin.catalogVisibilityRules.at(
        connection,
        {
          catalogVisibilityRuleId: rule1.id,
        },
      );
    },
  );

  // 10. Verify that the second rule still exists and remains enabled.
  const survivedRule: IShoppingMallCatalogVisibilityRule =
    await api.functional.shoppingMall.admin.catalogVisibilityRules.at(
      connection,
      {
        catalogVisibilityRuleId: rule2.id,
      },
    );
  typia.assert<IShoppingMallCatalogVisibilityRule>(survivedRule);

  TestValidator.equals(
    "surviving rule id should equal rule2.id",
    survivedRule.id,
    rule2.id,
  );
  TestValidator.predicate(
    "surviving rule should remain enabled",
    survivedRule.enabled === true,
  );
  TestValidator.equals(
    "surviving rule product id should still match product.id",
    survivedRule.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "surviving rule sku id should still match sku.id",
    survivedRule.shopping_mall_sku_id,
    sku.id,
  );
}
