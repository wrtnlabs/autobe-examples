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
 * Update a SKU external identifier while preserving system code and verifying
 * timestamps.
 *
 * Business journey:
 *
 * 1. Register an admin and a seller using their respective join endpoints.
 * 2. As admin, create a SKU inventory state and a catalog category.
 * 3. As seller, create a product under their account.
 * 4. As admin, link the product to the category for realistic catalog wiring.
 * 5. As seller, create a SKU for that product using the created inventory state.
 * 6. As admin, create an initial external ID mapping for the SKU (system_code +
 *    external_id).
 * 7. As admin, call PUT
 *    /shoppingMall/admin/skus/{skuId}/externalIds/{skuExternalId} to change the
 *    external_id to a new unique value while keeping the same system_code.
 * 8. Assert that:
 *
 *    - The updated mapping has the new external_id.
 *    - System_code is unchanged.
 *    - Created_at remains the same as before.
 *    - Updated_at is greater than created_at, reflecting the update.
 */
export async function test_api_sku_external_id_update_change_identifier_value(
  connection: api.IConnection,
) {
  // 1. Admin registration (join) to get an admin actor and initial token
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.test.com`,
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.test.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.test.com/landing" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoin);

  // 2. Explicit admin login to exercise login flow (and ensure fresh auth context)
  const adminLoginBody = {
    email: adminJoin.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.test.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.test.com/landing" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 3. Seller registration (join)
  const sellerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@seller.test.com` as string &
      tags.Format<"email">,
    password: "SellerPassw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.test.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.test.com/landing" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoin);

  // 4. Seller login to ensure seller auth context for seller endpoints
  const sellerLoginBody = {
    email: sellerJoin.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.test.com/login" as string & tags.Format<"uri">,
    referrer: "https://seller.test.com/landing" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 5. Admin creates a SKU inventory state (used later when creating the SKU)
  const inventoryStateBody = {
    code: `state_${RandomGenerator.alphabets(6)}`,
    name: "In Stock",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      { body: inventoryStateBody },
    );
  typia.assert(inventoryState);

  // 6. Admin creates a category
  const categoryBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphabets(8)}`,
    name_en: "Integration Category",
    description_en: RandomGenerator.paragraph({ sentences: 6 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // 7. Seller creates a product
  const productBody = {
    code: `P-${RandomGenerator.alphaNumeric(10)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri: "https://cdn.test.com/product.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 8. Switch back to admin and associate the product with the category
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

  // 9. Switch to seller again to create a SKU under the product
  const sellerLoginAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAgain);

  const skuCreateBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(8)}` as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 199.99 as number & tags.Minimum<0>,
    original_price: 249.99 as number & tags.Minimum<0>,
    inventory_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
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

  // 10. Switch to admin for SKU external ID management
  const adminLoginForExternal: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginForExternal);

  // 11. Create initial external ID mapping for the SKU
  const initialSystemCode = "ERP_MAIN";
  const initialExternalId = `SKU-OLD-${RandomGenerator.alphaNumeric(6)}`;

  const externalIdCreateBody = {
    system_code: initialSystemCode,
    external_id: initialExternalId,
  } satisfies IShoppingMallSkuExternalId.ICreate;

  const createdExternal: IShoppingMallSkuExternalId =
    await api.functional.shoppingMall.admin.skus.externalIds.create(
      connection,
      {
        skuId: sku.id,
        body: externalIdCreateBody,
      },
    );
  typia.assert(createdExternal);

  // 12. Perform the update: change external_id to a new unique value
  const newExternalId = `SKU-NEW-${RandomGenerator.alphaNumeric(6)}`;

  const externalIdUpdateBody = {
    // keep system_code unchanged; only change external_id
    external_id: newExternalId,
  } satisfies IShoppingMallSkuExternalId.IUpdate;

  const updatedExternal: IShoppingMallSkuExternalId =
    await api.functional.shoppingMall.admin.skus.externalIds.update(
      connection,
      {
        skuId: sku.id,
        skuExternalId: createdExternal.external_id,
        body: externalIdUpdateBody,
      },
    );
  typia.assert(updatedExternal);

  // 13. Business assertions
  TestValidator.equals(
    "external_id should be updated to the new value",
    updatedExternal.external_id,
    newExternalId,
  );

  TestValidator.equals(
    "system_code should remain unchanged after update",
    updatedExternal.system_code,
    createdExternal.system_code,
  );

  TestValidator.equals(
    "created_at should remain unchanged after update",
    updatedExternal.created_at,
    createdExternal.created_at,
  );

  TestValidator.predicate(
    "updated_at must be greater than created_at after update",
    new Date(updatedExternal.updated_at).getTime() >
      new Date(updatedExternal.created_at).getTime(),
  );
}
