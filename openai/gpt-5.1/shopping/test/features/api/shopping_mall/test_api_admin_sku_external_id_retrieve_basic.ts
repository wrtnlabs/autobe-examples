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
 * Basic retrieval of an admin-visible SKU external identifier mapping.
 *
 * Business goal
 *
 * - Ensure that an administrator can retrieve a specific SKU external ID mapping
 *   by skuId and skuExternalId after it has been created through the proper
 *   catalog and inventory flows.
 *
 * Scenario steps
 *
 * 1. Register an admin via POST /auth/admin/join and obtain an authenticated admin
 *    context.
 * 2. Register a seller via POST /auth/seller/join and obtain a seller context.
 * 3. As admin, create a category using POST /shoppingMall/admin/categories.
 * 4. As seller, create a product using POST /shoppingMall/seller/products.
 * 5. As admin, associate the product with the category using POST
 *    /shoppingMall/admin/products/{productId}/categories.
 * 6. As admin, create an inventory state through POST
 *    /shoppingMall/admin/skuInventoryStates.
 * 7. As seller, create a SKU for the product using POST
 *    /shoppingMall/seller/products/{productId}/skus, referencing the created
 *    inventory state.
 * 8. As admin, create an external ID mapping for that SKU using POST
 *    /shoppingMall/admin/skus/{skuId}/externalIds, capturing system_code and
 *    external_id.
 * 9. As admin, call GET
 *    /shoppingMall/admin/skus/{skuId}/externalIds/{skuExternalId} using the
 *    same skuId and external_id and validate that:
 *
 *    - Response type matches IShoppingMallSkuExternalId.
 *    - System_code and external_id equal the values used at creation time.
 *    - Id is present and created_at/updated_at are non-empty timestamps.
 *    - Deleted_at is null/undefined (active mapping).
 * 10. Optionally call GET with a different skuExternalId and verify that the API
 *     throws an error, confirming lookup specificity.
 */
export async function test_api_admin_sku_external_id_retrieve_basic(
  connection: api.IConnection,
) {
  // 1. Admin registration (join)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminJoinBody = {
    email: adminEmail,
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Seller registration (join)
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerJoinBody = {
    email: sellerEmail,
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 3. Ensure we have an admin context for admin-only operations.
  //    join has already logged us in as seller, so we need to re-login as admin.
  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoginResult: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginResult);

  // 4. Create a category as admin.
  const categoryBody = {
    parent_id: null,
    slug: RandomGenerator.alphabets(8),
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

  // 5. Switch back to seller context and create a product.
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoginResult: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginResult);

  const productBody = {
    code: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.paragraph({ sentences: 1 }),
    model_name: RandomGenerator.paragraph({ sentences: 1 }),
    status: "active",
    primary_image_uri:
      "https://cdn.example.com/images/sku-product.jpg" as string &
        tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 6. Switch to admin again to associate product with category.
  const adminLoginAgain: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAgain);

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

  // 7. Create an inventory state as admin.
  const inventoryStateBody = {
    code: RandomGenerator.alphabets(6),
    name: RandomGenerator.paragraph({ sentences: 1 }),
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

  // 8. Switch back to seller to create a SKU for the product.
  const sellerLoginAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAgain);

  const skuCreateBody = {
    code: RandomGenerator.alphaNumeric(12) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: RandomGenerator.alphaNumeric(13) as
      | (string & tags.MinLength<1> & tags.MaxLength<255>)
      | null
      | undefined,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 1000 as number & tags.Minimum<0>,
    original_price: 1200 as (number & tags.Minimum<0>) | null | undefined,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 2 as
      | (number & tags.Type<"int32"> & tags.Minimum<0>)
      | null
      | undefined,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 9. Switch to admin to create and retrieve external ID mapping.
  const adminLoginForExternal: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginForExternal);

  const externalIdBody = {
    system_code: "ERP" as string,
    external_id: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallSkuExternalId.ICreate;

  const createdExternal: IShoppingMallSkuExternalId =
    await api.functional.shoppingMall.admin.skus.externalIds.create(
      connection,
      {
        skuId: sku.id,
        body: externalIdBody,
      },
    );
  typia.assert(createdExternal);

  // 10. Retrieve the same mapping via GET using sku.id and external_id.
  const retrievedExternal: IShoppingMallSkuExternalId =
    await api.functional.shoppingMall.admin.skus.externalIds.at(connection, {
      skuId: sku.id,
      skuExternalId: externalIdBody.external_id,
    });
  typia.assert(retrievedExternal);

  // Business validations on retrieved mapping.
  TestValidator.equals(
    "system_code must match created mapping",
    retrievedExternal.system_code,
    externalIdBody.system_code,
  );
  TestValidator.equals(
    "external_id must match created mapping",
    retrievedExternal.external_id,
    externalIdBody.external_id,
  );
  TestValidator.predicate(
    "createdExternal.id should be non-empty string",
    !!createdExternal.id && createdExternal.id.length > 0,
  );
  TestValidator.predicate(
    "retrievedExternal.id should be non-empty string",
    !!retrievedExternal.id && retrievedExternal.id.length > 0,
  );
  TestValidator.predicate(
    "created_at timestamp should be non-empty",
    !!retrievedExternal.created_at && retrievedExternal.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp should be non-empty",
    !!retrievedExternal.updated_at && retrievedExternal.updated_at.length > 0,
  );
  TestValidator.predicate(
    "deleted_at should be null or undefined for active mapping",
    retrievedExternal.deleted_at === null ||
      retrievedExternal.deleted_at === undefined,
  );

  // 11. Optional negative case: using a wrong skuExternalId should result in
  //     an error (we don't assert status code, just that some error occurs).
  const invalidExternalId = `${externalIdBody.external_id}-X`;

  await TestValidator.error("invalid skuExternalId should error", async () => {
    await api.functional.shoppingMall.admin.skus.externalIds.at(connection, {
      skuId: sku.id,
      skuExternalId: invalidExternalId,
    });
  });
}
