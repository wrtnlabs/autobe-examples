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

export async function test_api_catalog_visibility_rule_create_sku_scoped_preorder_region_limited(
  connection: api.IConnection,
) {
  // 1. Seller joins (self-registration)
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const sellerJoinBody = {
    email: sellerEmail,
    password: typia.random<string & tags.Format<"password">>(),
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
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "AutoBE-Test-Brand",
    model_name: "Model-" + RandomGenerator.alphaNumeric(6),
    status: "active",
    primary_image_uri: "https://cdn.example.com/product.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 3. Admin joins
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorizedOnJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedOnJoin);

  const adminId: string & tags.Format<"uuid"> = adminAuthorizedOnJoin.id;

  // 4. Admin creates a preorder SKU inventory state (is_purchasable = true)
  const preorderCode = `preorder-${RandomGenerator.alphaNumeric(8)}`;
  const skuInventoryStateCreateBody = {
    code: preorderCode,
    name: "Preorder State",
    description:
      "Preorder inventory state for SKU-scoped region-limited visibility rules",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const preorderInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateCreateBody,
      },
    );
  typia.assert(preorderInventoryState);

  // 5. Switch back to seller context via login (ensures seller token active)
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/dashboard" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerAuthorizedOnLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerAuthorizedOnLogin);

  // 6. Seller creates a SKU under the created product, linking to preorder inventory state
  const skuCreateBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(6)}` as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 19900,
    original_price: 24900,
    inventory_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: preorderInventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 7. Switch to admin context via admin login (ensure admin token active)
  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/dashboard" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminAuthorizedOnLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedOnLogin);

  TestValidator.equals(
    "admin id should be stable between join and login",
    adminAuthorizedOnJoin.id,
    adminAuthorizedOnLogin.id,
  );

  // 8. Admin creates a SKU-scoped, region-limited preorder visibility rule
  const targetRegionCode = "KR";
  const ruleType = "preorder_region_limited";
  const ruleReason = "Preorder SKU visible only in region KR for test scenario";

  const visibilityRuleCreateBody = {
    rule_type: ruleType,
    actor_type: null,
    region_code: targetRegionCode,
    enabled: true,
    starts_at: null,
    ends_at: null,
    reason: ruleReason,
    shopping_mall_seller_id: null,
    shopping_mall_product_id: null,
    shopping_mall_sku_id: sku.id,
  } satisfies IShoppingMallCatalogVisibilityRule.ICreate;

  const visibilityRule: IShoppingMallCatalogVisibilityRule =
    await api.functional.shoppingMall.admin.catalogVisibilityRules.create(
      connection,
      {
        body: visibilityRuleCreateBody,
      },
    );
  typia.assert(visibilityRule);

  // 9. Validate response fields and business expectations
  TestValidator.equals(
    "visibility rule sku id matches created sku id",
    visibilityRule.shopping_mall_sku_id,
    sku.id,
  );

  TestValidator.equals(
    "visibility rule region_code matches requested region",
    visibilityRule.region_code,
    targetRegionCode,
  );

  TestValidator.equals(
    "visibility rule enabled flag is true",
    visibilityRule.enabled,
    true,
  );

  TestValidator.equals(
    "visibility rule rule_type matches requested type",
    visibilityRule.rule_type,
    ruleType,
  );

  TestValidator.equals(
    "visibility rule reason matches input",
    visibilityRule.reason,
    ruleReason,
  );

  TestValidator.equals(
    "visibility rule starts_at is null when not provided",
    visibilityRule.starts_at,
    null,
  );

  TestValidator.equals(
    "visibility rule ends_at is null when not provided",
    visibilityRule.ends_at,
    null,
  );

  TestValidator.equals(
    "visibility rule admin id matches authenticated admin",
    visibilityRule.shopping_mall_admin_id,
    adminId,
  );

  TestValidator.equals(
    "visibility rule seller scope is null as configured",
    visibilityRule.shopping_mall_seller_id,
    null,
  );

  TestValidator.equals(
    "visibility rule product scope is null as configured",
    visibilityRule.shopping_mall_product_id,
    null,
  );
}
