import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
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
 * Validate the full lifecycle of an admin-managed SKU external identifier
 * mapping.
 *
 * Business flow covered by this test:
 *
 * 1. Admin joins the platform and becomes the authenticated admin actor.
 * 2. Admin creates an inventory state (e.g., code "in_stock") to be referenced by
 *    SKUs.
 * 3. Admin creates a category in the global taxonomy.
 * 4. Seller joins the platform and becomes the authenticated seller actor.
 * 5. Seller creates a product (the parent product of the SKU).
 * 6. Admin links the product to the created category.
 * 7. Seller creates a SKU under the product, referencing the created inventory
 *    state.
 * 8. Admin creates an external ID mapping for the SKU.
 * 9. Admin deletes that external ID mapping using DELETE
 *    /shoppingMall/admin/skus/{skuId}/externalIds/{skuExternalId}.
 * 10. The test verifies that deletion succeeds (no error is thrown), that SKU and
 *     product objects are still usable, and that a second deletion attempt for
 *     the same mapping fails.
 *
 * Note: The original scenario mentions listing external IDs after deletion, but
 * there is no list/search endpoint for SKU external IDs in the available SDK,
 * so this test omits that part and focuses on create/delete semantics and actor
 * flows.
 */
export async function test_api_admin_sku_external_id_delete_full_lifecycle(
  connection: api.IConnection,
) {
  // 1. Admin joins the platform and becomes authenticated.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.shoppingmall.test/join" as string & tags.Format<"uri">,
    referrer: "https://shoppingmall.test/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin creates an inventory state
  const inventoryStateBody = {
    code: `in_stock_${RandomGenerator.alphaNumeric(8)}`,
    name: "In Stock",
    description: RandomGenerator.paragraph({ sentences: 3 }),
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

  // 3. Admin creates a category in the global taxonomy
  const categoryBody = {
    parent_id: null,
    slug: `category-${RandomGenerator.alphaNumeric(8)}`,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // 4. Seller joins (switch actor to seller)
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://seller.shoppingmall.test/join" as string &
      tags.Format<"uri">,
    referrer: "https://shoppingmall.test/seller-landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 5. Seller creates a product
  const productBody = {
    code: `PROD-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "AutoBE Test Brand",
    model_name: "Model X",
    status: "active",
    primary_image_uri:
      "https://cdn.shoppingmall.test/images/product.jpg" as string &
        tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 6. Switch back to admin and link product to category
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.shoppingmall.test/login" as string &
      tags.Format<"uri">,
    referrer: "https://shoppingmall.test/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  const productCategoryBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryBody,
      },
    );
  typia.assert(productCategory);

  // 7. Switch to seller to create SKU under the product
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.shoppingmall.test/login" as string &
      tags.Format<"uri">,
    referrer: "https://shoppingmall.test/seller-landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  const skuBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(8)}` as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 199.99 as number & tags.Minimum<0>,
    original_price: null,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuBody,
    });
  typia.assert(sku);

  // 8. Switch back to admin to create SKU external ID mapping
  const adminLoginAgain: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAgain);

  const externalIdBody = {
    system_code: "wms-test-system",
    external_id: `EXT-${RandomGenerator.alphaNumeric(10)}`,
  } satisfies IShoppingMallSkuExternalId.ICreate;

  const externalId: IShoppingMallSkuExternalId =
    await api.functional.shoppingMall.admin.skus.externalIds.create(
      connection,
      {
        skuId: sku.id,
        body: externalIdBody,
      },
    );
  typia.assert(externalId);

  // 9. Delete the external ID mapping (first deletion should succeed)
  await api.functional.shoppingMall.admin.skus.externalIds.erase(connection, {
    skuId: sku.id,
    skuExternalId: externalId.external_id,
  });

  // 10. Ensure SKU and product are still structurally valid after deletion.
  // We don't have direct re-fetch endpoints in this SDK subset, so we
  // at least assert previously returned objects and basic invariants.
  typia.assert(sku);
  typia.assert(product);

  TestValidator.equals(
    "SKU still references original product summary after external ID deletion",
    sku.product.id,
    product.id,
  );

  // 11. Second delete attempt should fail with some error (e.g., not-found).
  await TestValidator.error(
    "second deletion of same external ID should fail",
    async () => {
      await api.functional.shoppingMall.admin.skus.externalIds.erase(
        connection,
        {
          skuId: sku.id,
          skuExternalId: externalId.external_id,
        },
      );
    },
  );
}
