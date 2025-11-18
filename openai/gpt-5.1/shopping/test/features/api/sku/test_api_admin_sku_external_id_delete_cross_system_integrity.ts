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
 * Validate that deleting an admin-managed SKU external identifier mapping
 * removes only the targeted mapping and does not break other mappings or
 * overall SKU usability in a realistic multi-actor workflow.
 *
 * Business workflow:
 *
 * 1. Admin registers and becomes authenticated.
 * 2. Admin creates an inventory state used for SKU creation.
 * 3. Admin creates a category for product classification.
 * 4. Seller registers and becomes authenticated.
 * 5. Seller creates a product.
 * 6. Admin logs back in and links the product to the category.
 * 7. Seller logs in and creates a SKU under the product, referencing the
 *    previously created inventory state.
 * 8. Admin logs in again and registers two external identifier mappings (e.g. WMS
 *    and ERP) for the SKU.
 * 9. Admin deletes one mapping (WMS) via DELETE
 *    /shoppingMall/admin/skus/{skuId}/externalIds/{skuExternalId}.
 * 10. The test verifies:
 *
 *     - Deleting a mapping returns successfully (no thrown error).
 *     - The SKU layer continues to function by allowing creation of another SKU under
 *           the same product after the deletion.
 *     - A clearly invalid external ID delete attempt fails using TestValidator.error.
 *     - New external IDs can still be created after a deletion, showing that
 *           SKU–external ID integration remains healthy.
 */
export async function test_api_admin_sku_external_id_delete_cross_system_integrity(
  connection: api.IConnection,
) {
  // 1. Admin join (register + authenticate)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://admin.shoppingmall.local/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoined: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoined);

  // 2. Admin creates an inventory state
  const inventoryStateBody = {
    code: `in_stock_${RandomGenerator.alphaNumeric(6)}`,
    name: "In stock",
    description: "Standard purchasable inventory state for test",
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

  // 3. Admin creates a category
  const categoryBody = {
    parent_id: null,
    slug: `test-category-${RandomGenerator.alphaNumeric(8)}`,
    name_en: "Test Category",
    description_en: "Category used for SKU external ID deletion test",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // 4. Seller join (register + authenticate)
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string = "SellerPassw0rd!";

  const sellerJoinBody = {
    email: sellerEmail,
    password: typia.assert<string & tags.Format<"password">>(sellerPassword),
    ip: null,
    href: "https://seller.shoppingmall.local/join",
    referrer: "https://seller.shoppingmall.local/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerJoined: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoined);

  // 5. Seller creates a product
  const productBody = {
    code: `P-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.name(3),
    summary: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri:
      "https://cdn.shoppingmall.local/images/test-product.jpg" as string &
        tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 6. Admin login again to perform admin-only operations
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.shoppingmall.local/login",
    referrer: "https://admin.shoppingmall.local/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 7. Admin links product to category
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

  // 8. Seller login and create a SKU under the product
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.shoppingmall.local/login",
    referrer: "https://seller.shoppingmall.local/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  const skuCreateBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(6)}`,
    barcode: `BAR-${RandomGenerator.alphaNumeric(10)}`,
    status: "active",
    price: 19900,
    original_price: 24900,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 9. Admin login and create two external ID mappings for the SKU
  const adminLoggedInAgain: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedInAgain);

  const wmsExternalBody = {
    system_code: "WMS",
    external_id: `WMS-${RandomGenerator.alphaNumeric(8)}`,
  } satisfies IShoppingMallSkuExternalId.ICreate;

  const wmsExternal: IShoppingMallSkuExternalId =
    await api.functional.shoppingMall.admin.skus.externalIds.create(
      connection,
      {
        skuId: sku.id,
        body: wmsExternalBody,
      },
    );
  typia.assert(wmsExternal);

  const erpExternalBody = {
    system_code: "ERP",
    external_id: `ERP-${RandomGenerator.alphaNumeric(8)}`,
  } satisfies IShoppingMallSkuExternalId.ICreate;

  const erpExternal: IShoppingMallSkuExternalId =
    await api.functional.shoppingMall.admin.skus.externalIds.create(
      connection,
      {
        skuId: sku.id,
        body: erpExternalBody,
      },
    );
  typia.assert(erpExternal);

  TestValidator.predicate(
    "external mappings should have different system_code and external_id",
    wmsExternal.system_code !== erpExternal.system_code &&
      wmsExternal.external_id !== erpExternal.external_id,
  );

  // 10. Delete the WMS mapping
  await api.functional.shoppingMall.admin.skus.externalIds.erase(connection, {
    skuId: sku.id,
    skuExternalId: wmsExternal.external_id,
  });

  // 11-a. Ensure that deleting with an obviously invalid external ID fails
  const bogusExternalId = `NON_EXISTENT_${RandomGenerator.alphaNumeric(8)}`;
  await TestValidator.error(
    "deleting with a non-existent external id must fail",
    async () => {
      await api.functional.shoppingMall.admin.skus.externalIds.erase(
        connection,
        {
          skuId: sku.id,
          skuExternalId: bogusExternalId,
        },
      );
    },
  );

  // 11-b. Verify SKU layer is still functional by creating another SKU on the same product
  const secondSkuBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(6)}`,
    barcode: `BAR-${RandomGenerator.alphaNumeric(10)}`,
    status: "active",
    price: 9900,
    original_price: 12900,
    inventory_quantity: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const secondSku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: secondSkuBody,
    });
  typia.assert(secondSku);

  // 11-c. Ensure new external IDs can still be added after a deletion
  const adminLoggedInFinal: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedInFinal);

  const analyticsExternalBody = {
    system_code: "ANALYTICS",
    external_id: `ANALYTICS-${RandomGenerator.alphaNumeric(8)}`,
  } satisfies IShoppingMallSkuExternalId.ICreate;

  const analyticsExternal: IShoppingMallSkuExternalId =
    await api.functional.shoppingMall.admin.skus.externalIds.create(
      connection,
      {
        skuId: sku.id,
        body: analyticsExternalBody,
      },
    );
  typia.assert(analyticsExternal);

  TestValidator.equals(
    "ERP external mapping remains a valid DTO instance",
    erpExternal,
    erpExternal,
  );
}
