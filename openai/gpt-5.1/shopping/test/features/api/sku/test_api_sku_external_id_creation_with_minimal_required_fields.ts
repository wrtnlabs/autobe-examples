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
 * Validate minimal creation of a SKU external ID mapping by an admin.
 *
 * Business context
 *
 * - External IDs are used to link internal SKUs to external systems (ERP, WMS,
 *   marketplaces, etc.).
 * - Admins manage these mappings via
 *   /shoppingMall/admin/skus/{skuId}/externalIds.
 * - This test ensures that providing only the required fields (system_code and
 *   external_id) is sufficient to create a valid mapping for an existing SKU.
 *
 * End-to-end flow
 *
 * 1. Register an admin and a seller; rely on SDK to apply tokens to the shared
 *    connection.
 * 2. As the seller, create a base product.
 * 3. As the admin, create a SKU inventory state to reference from the SKU.
 * 4. (Optional realism) As the admin, create a category and link the product to
 *    it.
 * 5. As the seller, create a SKU under the product, using the created inventory
 *    state.
 * 6. As the admin, create a SKU external ID using only system_code and
 *    external_id.
 * 7. Assert that the response matches IShoppingMallSkuExternalId and that
 *    system_code/external_id echo the request and audit fields are present.
 */
export async function test_api_sku_external_id_creation_with_minimal_required_fields(
  connection: api.IConnection,
) {
  // 1. Admin and seller registration/login
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://shoppingmall.local/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoin);

  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://seller.shoppingmall.local/join",
    referrer: "https://shoppingmall.local/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoin);

  // Switch explicitly to seller via login (even though join already authenticated),
  // to follow the dependency description and to make the actor identity clear.
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.shoppingmall.local/login",
    referrer: "https://shoppingmall.local/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 2. As seller, create base product
  const productBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.name(1),
    model_name: null,
    status: "active",
    primary_image_uri:
      "https://cdn.shoppingmall.local/images/" +
      RandomGenerator.alphaNumeric(12),
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 3. Switch back to admin and create SKU inventory state
  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.shoppingmall.local/login",
    referrer: "https://shoppingmall.local/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  const inventoryStateBody = {
    code: "in_stock_" + RandomGenerator.alphaNumeric(6),
    name: "In Stock (Purchasable)",
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

  // 4. Optional: create a category and link the product to it
  const categoryBody = {
    parent_id: null,
    slug: "electronics-" + RandomGenerator.alphaNumeric(6),
    name_en: "Electronics",
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

  // 5. Switch to seller and create SKU with minimal required fields
  const sellerLoginAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAgain);

  const skuBody = {
    code: "SKU-" + RandomGenerator.alphaNumeric(6),
    barcode: null,
    status: "active",
    price: 9999,
    original_price: null,
    inventory_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: null,
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

  // 6. Switch to admin and create SKU external ID with minimal required fields
  const adminLoginAgain: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAgain);

  const externalIdBody = {
    system_code: "erp_" + RandomGenerator.alphaNumeric(4),
    external_id: "EXT-" + RandomGenerator.alphaNumeric(10),
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

  // 7. Business assertions
  TestValidator.equals(
    "external ID system_code should match request",
    externalId.system_code,
    externalIdBody.system_code,
  );
  TestValidator.equals(
    "external ID external_id should match request",
    externalId.external_id,
    externalIdBody.external_id,
  );

  TestValidator.predicate(
    "external ID created_at should be present",
    externalId.created_at !== null && externalId.created_at !== undefined,
  );
  TestValidator.predicate(
    "external ID updated_at should be present",
    externalId.updated_at !== null && externalId.updated_at !== undefined,
  );
  TestValidator.equals(
    "external ID deleted_at should be null on creation",
    externalId.deleted_at ?? null,
    null,
  );
}
