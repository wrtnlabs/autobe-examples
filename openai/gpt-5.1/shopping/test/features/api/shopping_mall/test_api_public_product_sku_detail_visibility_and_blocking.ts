import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCatalogBlockReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogBlockReason";
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

export async function test_api_public_product_sku_detail_visibility_and_blocking(
  connection: api.IConnection,
) {
  // 1. Seller joins the platform
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 2. Seller creates a product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.name(1),
    model_name: RandomGenerator.alphaNumeric(8),
    status: "active",
    primary_image_uri:
      "https://cdn.example.com/images/" + RandomGenerator.alphaNumeric(16),
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 3. Admin joins the platform
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(20) as string &
      tags.Format<"password">,
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
  const categoryCreateBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(10),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  // 5. Admin links product to the category
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

  // 6. Admin creates an inventory state (purchasable)
  const inventoryStateCreateBody = {
    code: "in_stock_" + RandomGenerator.alphaNumeric(6),
    name: "In Stock",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: inventoryStateCreateBody,
      },
    );
  typia.assert(inventoryState);

  // 7. Switch back to seller by logging in (to ensure seller context)
  const sellerLoginBody = {
    email: sellerAuthorized.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // 8. Seller creates a SKU under the product, bound to the inventory state
  const skuCreateBody = {
    code: "SKU-" + RandomGenerator.alphaNumeric(10),
    barcode: RandomGenerator.alphaNumeric(13),
    status: "active",
    price: 100 as number & tags.Minimum<0>,
    original_price: 150 as number & tags.Minimum<0>,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [
      {
        system_code: "WMS",
        external_id: "EXT-" + RandomGenerator.alphaNumeric(8),
      } satisfies IShoppingMallSkuExternalId.ICreate,
    ],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 9. As public client, initially fetch the SKU detail - should succeed
  const initialSku: IShoppingMallSku =
    await api.functional.shoppingMall.products.skus.at(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      skuId: sku.id,
    });
  typia.assert(initialSku);

  TestValidator.equals(
    "initial SKU detail should match created SKU id",
    initialSku.id,
    sku.id,
  );

  // 10. Switch to admin via login to configure blocking/visibility rules
  const adminLoginBody = {
    email: adminAuthorized.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 11. (Optional) Admin creates a catalog block reason for documentation
  const blockReasonCreateBody = {
    code: "hidden_for_test_" + RandomGenerator.alphaNumeric(6),
    name: "Hidden by test visibility rule",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    severity_level: "low",
  } satisfies IShoppingMallCatalogBlockReason.ICreate;

  const blockReason: IShoppingMallCatalogBlockReason =
    await api.functional.shoppingMall.admin.catalogBlockReasons.create(
      connection,
      {
        body: blockReasonCreateBody,
      },
    );
  typia.assert(blockReason);

  // 12. Admin creates a SKU-specific visibility rule that hides this SKU
  const now = new Date();
  const startsAt = now.toISOString() as string & tags.Format<"date-time">;

  const visibilityRuleCreateBody = {
    rule_type: "hide",
    actor_type: null,
    region_code: null,
    enabled: true,
    starts_at: startsAt,
    ends_at: null,
    reason: `Hidden for block reason ${blockReason.code}`,
    shopping_mall_seller_id: null,
    shopping_mall_product_id: product.id,
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

  TestValidator.equals(
    "visibility rule should target created SKU",
    visibilityRule.sku?.id ?? null,
    sku.id,
  );

  // 13. As public client again, the SKU detail should now be inaccessible
  await TestValidator.error(
    "hidden SKU detail should not be accessible",
    async () => {
      await api.functional.shoppingMall.products.skus.at(connection, {
        productId: product.id as string & tags.Format<"uuid">,
        skuId: sku.id,
      });
    },
  );
}
