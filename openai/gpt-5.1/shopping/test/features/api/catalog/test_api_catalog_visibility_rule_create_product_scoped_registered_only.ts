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
 * Create a product-scoped catalog visibility rule that restricts visibility to
 * registered (non-guest) users for a specific product.
 *
 * Business flow:
 *
 * 1. A seller joins via /auth/seller/join and becomes authenticated.
 * 2. The seller creates a product via /shoppingMall/seller/products.
 * 3. An admin joins via /auth/admin/join and becomes authenticated.
 * 4. The admin creates a catalog visibility rule via
 *    /shoppingMall/admin/catalogVisibilityRules that:
 *
 *    - Targets the created product (shopping_mall_product_id).
 *    - Uses a rule_type expressing "registered-only" visibility semantics.
 *    - Uses actor_type targeting registered customers (e.g., "customer").
 *    - Is enabled and has a descriptive reason.
 * 5. The test verifies that the rule correctly references the product and admin,
 *    is enabled, and has the expected rule_type and actor_type while remaining
 *    product-scoped only (no seller/SKU/region scope).
 */
export async function test_api_catalog_visibility_rule_create_product_scoped_registered_only(
  connection: api.IConnection,
) {
  // 1. Seller joins and becomes authenticated
  const sellerJoinBody = {
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
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 2. Seller creates a product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    brand: RandomGenerator.name(1),
    model_name: RandomGenerator.alphaNumeric(6),
    status: "active",
    primary_image_uri: "https://cdn.example.com/product/main.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // Ensure the new product is owned by the authenticated seller
  TestValidator.equals(
    "created product belongs to the authenticated seller",
    product.shopping_mall_seller_id,
    sellerAuthorized.id,
  );

  // 3. Admin joins and becomes authenticated
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
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

  // 4. Admin creates product-scoped catalog visibility rule
  const ruleType = "show_only_to_registered";
  const actorType = "customer";
  const reasonText = "product visible only to registered users";

  const ruleCreateBody = {
    rule_type: ruleType,
    actor_type: actorType,
    region_code: null,
    enabled: true,
    starts_at: null,
    ends_at: null,
    reason: reasonText,
    shopping_mall_seller_id: null,
    shopping_mall_product_id: product.id,
    shopping_mall_sku_id: null,
  } satisfies IShoppingMallCatalogVisibilityRule.ICreate;

  const rule: IShoppingMallCatalogVisibilityRule =
    await api.functional.shoppingMall.admin.catalogVisibilityRules.create(
      connection,
      {
        body: ruleCreateBody,
      },
    );
  typia.assert(rule);

  // 5. Assert core linkage and flags
  TestValidator.equals(
    "visibility rule is linked to the correct product id",
    rule.shopping_mall_product_id,
    product.id,
  );

  TestValidator.equals(
    "visibility rule is created by the authenticated admin",
    rule.shopping_mall_admin_id,
    adminAuthorized.id,
  );

  TestValidator.equals(
    "visibility rule enabled flag is true",
    rule.enabled,
    true,
  );

  TestValidator.equals(
    "visibility rule_type is persisted as requested",
    rule.rule_type,
    ruleType,
  );

  TestValidator.equals(
    "visibility actor_type is persisted as requested",
    rule.actor_type,
    actorType,
  );

  TestValidator.equals(
    "visibility reason is persisted as requested",
    rule.reason,
    reasonText,
  );

  // 6. Product-scoped only: seller, sku, and region scope remain null
  TestValidator.equals(
    "seller scope is null for product-scoped rule",
    rule.shopping_mall_seller_id,
    null,
  );

  TestValidator.equals(
    "SKU scope is null for product-scoped rule",
    rule.shopping_mall_sku_id,
    null,
  );

  TestValidator.equals(
    "region code is null for non-region-specific rule",
    rule.region_code,
    null,
  );

  // 7. When admin and product summaries are present, validate consistency
  if (rule.admin !== undefined) {
    TestValidator.equals(
      "embedded admin summary id matches creator admin id",
      rule.admin.id,
      adminAuthorized.id,
    );

    TestValidator.equals(
      "embedded admin summary email matches creator admin email",
      rule.admin.email,
      adminAuthorized.email,
    );
  }

  if (rule.product !== undefined && rule.product !== null) {
    TestValidator.equals(
      "embedded product summary id matches product id",
      rule.product.id,
      product.id,
    );
  }
}
