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
 * Ensure that updating a SKU external ID to a value that conflicts with another
 * existing mapping is rejected according to uniqueness rules.
 *
 * Business flow:
 *
 * 1. Admin joins and logs in (admin context for inventory state, category and
 *    external IDs).
 * 2. Seller joins and logs in (seller context for product and SKU creation).
 * 3. Admin creates a SKU inventory state; its id is later used when creating the
 *    SKU.
 * 4. Admin creates a category.
 * 5. Seller creates a product.
 * 6. Admin links the product to the category.
 * 7. Seller creates a SKU under the product, referencing the admin-created
 *    inventory state.
 * 8. Admin creates two external ID mappings for the same SKU and same system_code:
 *
 *    - Mapping A: external_id "SKU-001".
 *    - Mapping B: external_id "SKU-002".
 * 9. Admin attempts to update mapping B via PUT
 *    /shoppingMall/admin/skus/{skuId}/externalIds/{skuExternalId} so that
 *    external_id becomes "SKU-001", colliding with mapping A in the same
 *    system_code.
 * 10. The update must fail; we assert this via TestValidator.error (without
 *     checking specific status code).
 * 11. To confirm mapping B was not overwritten, admin performs a follow-up
 *     successful update of mapping B to a non-conflicting external_id (e.g.
 *     "SKU-003"). If this succeeds, it implies mapping B still exists and the
 *     failed conflicting update did not corrupt state.
 */
export async function test_api_sku_external_id_update_rejects_conflicting_identifier(
  connection: api.IConnection,
) {
  // 1. Admin joins
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoin);

  // 2. Admin login (ensure login flow works and context is refreshed)
  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.shoppingmall.test/login",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 3. Admin creates inventory state
  const inventoryStateBody = {
    code: `INV_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 4 }),
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

  // 4. Admin creates category
  const categoryBody = {
    parent_id: null,
    slug: `category-${RandomGenerator.alphaNumeric(8)}`,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 5 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // 5. Seller joins
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://seller.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoin);

  // 6. Seller login
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.shoppingmall.test/login",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 7. Seller creates product
  const productBody = {
    code: `P-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.paragraph({ sentences: 1 }),
    model_name: RandomGenerator.paragraph({ sentences: 1 }),
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

  // 8. Switch back to admin to link product to category
  const adminRelogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminRelogin);

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

  // 9. Switch to seller to create SKU under the product
  const sellerRelogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerRelogin);

  const skuBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(8)}` as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 1000 as number & tags.Minimum<0>,
    original_price: 1200 as number & tags.Minimum<0>,
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

  // 10. Switch to admin to manage external IDs
  const adminForExternalIds: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminForExternalIds);

  const systemCode = "ERP_MAIN";

  // Mapping A: system_code ERP_MAIN, external_id SKU-001
  const mappingABody = {
    system_code: systemCode,
    external_id: "SKU-001",
  } satisfies IShoppingMallSkuExternalId.ICreate;

  const mappingA: IShoppingMallSkuExternalId =
    await api.functional.shoppingMall.admin.skus.externalIds.create(
      connection,
      {
        skuId: sku.id,
        body: mappingABody,
      },
    );
  typia.assert(mappingA);

  // Mapping B: system_code ERP_MAIN, external_id SKU-002
  const mappingBBody = {
    system_code: systemCode,
    external_id: "SKU-002",
  } satisfies IShoppingMallSkuExternalId.ICreate;

  const mappingB: IShoppingMallSkuExternalId =
    await api.functional.shoppingMall.admin.skus.externalIds.create(
      connection,
      {
        skuId: sku.id,
        body: mappingBBody,
      },
    );
  typia.assert(mappingB);

  TestValidator.notEquals(
    "mapping A and B must have different external_id initially",
    mappingA.external_id,
    mappingB.external_id,
  );

  // 11. Attempt conflicting update: change mapping B external_id to SKU-001
  await TestValidator.error(
    "conflicting external_id update must fail",
    async () => {
      await api.functional.shoppingMall.admin.skus.externalIds.update(
        connection,
        {
          skuId: sku.id as string & tags.Format<"uuid">,
          skuExternalId: mappingB.external_id,
          body: {
            system_code: systemCode,
            external_id: mappingA.external_id,
          } satisfies IShoppingMallSkuExternalId.IUpdate,
        },
      );
    },
  );

  // 12. Non-conflicting follow-up update for mapping B to ensure it still exists
  const nonConflictingExternalId = "SKU-003";

  const updatedMappingB: IShoppingMallSkuExternalId =
    await api.functional.shoppingMall.admin.skus.externalIds.update(
      connection,
      {
        skuId: sku.id as string & tags.Format<"uuid">,
        skuExternalId: mappingB.external_id,
        body: {
          system_code: systemCode,
          external_id: nonConflictingExternalId,
        } satisfies IShoppingMallSkuExternalId.IUpdate,
      },
    );
  typia.assert(updatedMappingB);

  TestValidator.equals(
    "mapping B should be updated to non-conflicting external_id after failed conflict",
    updatedMappingB.external_id,
    nonConflictingExternalId,
  );
}
