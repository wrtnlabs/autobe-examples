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

/**
 * Validate that an existing global catalog visibility rule can be re-scoped to
 * a specific product without unintentionally altering unrelated fields.
 *
 * Business flow:
 *
 * 1. A seller self-registers via /auth/seller/join.
 * 2. The seller creates a product via /shoppingMall/seller/products.
 * 3. An admin joins via /auth/admin/join and becomes the active actor.
 * 4. The admin creates a _global_ visibility rule via
 *    /shoppingMall/admin/catalogVisibilityRules with no seller/product/sku
 *    ids.
 * 5. The admin updates that rule via
 *    /shoppingMall/admin/catalogVisibilityRules/{catalogVisibilityRuleId} by
 *    setting shopping_mall_product_id to the seller’s product id and changing
 *    the reason message, but without touching rule_type, actor_type,
 *    region_code, enabled, starts_at, or ends_at.
 * 6. The response must show that:
 *
 *    - Id is unchanged,
 *    - Shopping_mall_product_id is now the product id,
 *    - Shopping_mall_seller_id and shopping_mall_sku_id remain null,
 *    - Rule_type, actor_type, region_code, enabled, starts_at, ends_at all remain
 *         equal to the original rule,
 *    - Reason changed to the new reason,
 *    - Created_at is unchanged,
 *    - Updated_at has changed and is not earlier than created_at.
 * 7. Additional predicates must assert that only the intended foreign key
 *    (product) has changed and that no unrelated fields were cleared.
 */
export async function test_api_catalog_visibility_rule_update_change_scope_to_specific_product(
  connection: api.IConnection,
) {
  // 1. Seller joins
  const sellerJoinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinRequest,
    });
  typia.assert(sellerAuthorized);

  // 2. Seller creates a product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri: "https://cdn.example.com/image.png" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 3. Admin joins (this will switch connection to admin actor)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(14) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 4. Admin creates a global catalog visibility rule
  const now = new Date();
  const later = new Date(now.getTime() + 1000 * 60 * 60); // +1 hour

  const createRuleBody = {
    rule_type: "hide", // arbitrary business rule type
    actor_type: null,
    region_code: null,
    enabled: true,
    starts_at: now.toISOString() as string & tags.Format<"date-time">,
    ends_at: later.toISOString() as string & tags.Format<"date-time">,
    reason: "Global maintenance window",
    shopping_mall_seller_id: null,
    shopping_mall_product_id: null,
    shopping_mall_sku_id: null,
  } satisfies IShoppingMallCatalogVisibilityRule.ICreate;

  const originalRule: IShoppingMallCatalogVisibilityRule =
    await api.functional.shoppingMall.admin.catalogVisibilityRules.create(
      connection,
      { body: createRuleBody },
    );
  typia.assert(originalRule);

  // Sanity-check that the created rule is global scoped
  TestValidator.equals(
    "created rule is global (no seller)",
    originalRule.shopping_mall_seller_id ?? null,
    null,
  );
  TestValidator.equals(
    "created rule is global (no product)",
    originalRule.shopping_mall_product_id ?? null,
    null,
  );
  TestValidator.equals(
    "created rule is global (no sku)",
    originalRule.shopping_mall_sku_id ?? null,
    null,
  );

  // 5. Admin updates rule to scope it to the specific product
  const newReason = `Product scoped rule for product ${product.id}`;

  const updateBody = {
    shopping_mall_product_id: product.id,
    reason: newReason,
  } satisfies IShoppingMallCatalogVisibilityRule.IUpdate;

  const updatedRule: IShoppingMallCatalogVisibilityRule =
    await api.functional.shoppingMall.admin.catalogVisibilityRules.update(
      connection,
      {
        catalogVisibilityRuleId: originalRule.id,
        body: updateBody,
      },
    );
  typia.assert(updatedRule);

  // 6. Assertions comparing original and updated rules
  TestValidator.equals(
    "rule id unchanged after update",
    updatedRule.id,
    originalRule.id,
  );

  TestValidator.equals(
    "product id set to created product",
    updatedRule.shopping_mall_product_id ?? null,
    product.id,
  );

  TestValidator.equals(
    "seller id remains null after product scoping",
    updatedRule.shopping_mall_seller_id ?? null,
    originalRule.shopping_mall_seller_id ?? null,
  );

  TestValidator.equals(
    "sku id remains null after product scoping",
    updatedRule.shopping_mall_sku_id ?? null,
    originalRule.shopping_mall_sku_id ?? null,
  );

  TestValidator.equals(
    "rule_type unchanged by update",
    updatedRule.rule_type,
    originalRule.rule_type,
  );

  TestValidator.equals(
    "actor_type unchanged by update",
    updatedRule.actor_type ?? null,
    originalRule.actor_type ?? null,
  );

  TestValidator.equals(
    "region_code unchanged by update",
    updatedRule.region_code ?? null,
    originalRule.region_code ?? null,
  );

  TestValidator.equals(
    "enabled flag unchanged by update",
    updatedRule.enabled,
    originalRule.enabled,
  );

  TestValidator.equals(
    "starts_at unchanged by update",
    updatedRule.starts_at ?? null,
    originalRule.starts_at ?? null,
  );

  TestValidator.equals(
    "ends_at unchanged by update",
    updatedRule.ends_at ?? null,
    originalRule.ends_at ?? null,
  );

  TestValidator.equals(
    "reason updated to new value",
    updatedRule.reason ?? null,
    newReason,
  );

  TestValidator.equals(
    "created_at remains unchanged",
    updatedRule.created_at,
    originalRule.created_at,
  );

  TestValidator.notEquals(
    "updated_at changed after update",
    updatedRule.updated_at,
    originalRule.updated_at,
  );

  // 7. Temporal and business consistency checks
  const createdAtDate = new Date(updatedRule.created_at);
  const updatedAtDate = new Date(updatedRule.updated_at);

  TestValidator.predicate(
    "updated_at is not before created_at",
    updatedAtDate.getTime() >= createdAtDate.getTime(),
  );

  // Ensure that only product scoping changed among FK scope fields
  TestValidator.equals(
    "seller scope unchanged when re-scoping to product",
    updatedRule.shopping_mall_seller_id ?? null,
    originalRule.shopping_mall_seller_id ?? null,
  );
  TestValidator.equals(
    "sku scope unchanged when re-scoping to product",
    updatedRule.shopping_mall_sku_id ?? null,
    originalRule.shopping_mall_sku_id ?? null,
  );
}
