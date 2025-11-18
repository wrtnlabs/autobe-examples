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

export async function test_api_catalog_visibility_rule_update_clear_product_and_sku_scope(
  connection: api.IConnection,
) {
  // 1. Seller joins the platform
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 2. Seller creates a product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "AutoBE Test Brand",
    model_name: "Model-" + RandomGenerator.alphaNumeric(6),
    status: "active",
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    default_locale: "ko-KR",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 3. Seller creates a SKU under that product
  const skuCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    barcode: null,
    status: "active",
    price: 19900,
    original_price: 24900,
    inventory_quantity: 100,
    low_stock_threshold: 5,
    shopping_mall_sku_inventory_state_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    attribute_value_ids: undefined,
    external_ids: undefined,
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuCreateBody,
    });
  typia.assert<IShoppingMallSku>(sku);

  // Ensure SKU is linked to the correct product
  TestValidator.equals(
    "sku.product.id should match created product.id",
    sku.product.id,
    product.id,
  );

  // 4. Admin joins (authenticate admin actor)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 5. Admin creates a SKU-scoped visibility rule
  const createRuleBody = {
    rule_type: "hide",
    actor_type: "customer",
    region_code: "KR",
    enabled: true,
    starts_at: null,
    ends_at: null,
    reason: "SKU-level hide for test",
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_product_id: product.id,
    shopping_mall_sku_id: sku.id,
  } satisfies IShoppingMallCatalogVisibilityRule.ICreate;

  const createdRule: IShoppingMallCatalogVisibilityRule =
    await api.functional.shoppingMall.admin.catalogVisibilityRules.create(
      connection,
      {
        body: createRuleBody,
      },
    );
  typia.assert<IShoppingMallCatalogVisibilityRule>(createdRule);

  // 6. Admin updates the rule to clear product and SKU scope
  const updateBody = {
    shopping_mall_product_id: null,
    shopping_mall_sku_id: null,
  } satisfies IShoppingMallCatalogVisibilityRule.IUpdate;

  const updatedRule: IShoppingMallCatalogVisibilityRule =
    await api.functional.shoppingMall.admin.catalogVisibilityRules.update(
      connection,
      {
        catalogVisibilityRuleId: createdRule.id,
        body: updateBody,
      },
    );
  typia.assert<IShoppingMallCatalogVisibilityRule>(updatedRule);

  // 7. Business validations
  // Rule id must remain the same
  TestValidator.equals(
    "updated rule id should equal original",
    updatedRule.id,
    createdRule.id,
  );

  // Seller scope must remain unchanged
  TestValidator.equals(
    "seller scope should remain the same",
    updatedRule.shopping_mall_seller_id ?? null,
    createdRule.shopping_mall_seller_id ?? null,
  );

  // Product and SKU scope must be cleared (null)
  TestValidator.equals(
    "product scope should be cleared to null",
    updatedRule.shopping_mall_product_id ?? null,
    null,
  );
  TestValidator.equals(
    "sku scope should be cleared to null",
    updatedRule.shopping_mall_sku_id ?? null,
    null,
  );

  // Other business fields should remain consistent
  TestValidator.equals(
    "rule_type should remain unchanged",
    updatedRule.rule_type,
    createdRule.rule_type,
  );
  TestValidator.equals(
    "actor_type should remain unchanged",
    updatedRule.actor_type ?? null,
    createdRule.actor_type ?? null,
  );
  TestValidator.equals(
    "region_code should remain unchanged",
    updatedRule.region_code ?? null,
    createdRule.region_code ?? null,
  );
  TestValidator.equals(
    "enabled flag should remain unchanged",
    updatedRule.enabled,
    createdRule.enabled,
  );

  // updated_at should be changed or at least not earlier than original
  const createdUpdatedAtTime = Date.parse(createdRule.updated_at);
  const updatedUpdatedAtTime = Date.parse(updatedRule.updated_at);

  TestValidator.predicate(
    "updated_at should be greater than or equal to original updated_at",
    updatedUpdatedAtTime >= createdUpdatedAtTime,
  );
}
