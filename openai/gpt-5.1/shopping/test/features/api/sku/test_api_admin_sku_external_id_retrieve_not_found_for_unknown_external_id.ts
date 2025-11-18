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
 * Validate admin retrieval of SKU external IDs returns an error for unknown
 * identifiers.
 *
 * Business objective: Ensure that when an administrator attempts to retrieve an
 * external ID mapping for a valid SKU using an external identifier value that
 * does not exist for that SKU, the API fails (models HTTP 404/not-found)
 * instead of returning any mapping. Also confirm that existing, valid mappings
 * remain accessible and are unaffected by such failed lookups.
 *
 * End-to-end flow:
 *
 * 1. Register an admin account (POST /auth/admin/join) and become authenticated as
 *    admin.
 * 2. Register a seller account (POST /auth/seller/join).
 * 3. As seller, create a product (POST /shoppingMall/seller/products).
 * 4. As admin, create an inventory state (POST
 *    /shoppingMall/admin/skuInventoryStates).
 * 5. As seller, create an SKU under the product referencing the created inventory
 *    state (POST /shoppingMall/seller/products/{productId}/skus).
 * 6. As admin, create one valid external ID mapping for the SKU (POST
 *    /shoppingMall/admin/skus/{skuId}/externalIds).
 * 7. As admin, call GET
 *    /shoppingMall/admin/skus/{skuId}/externalIds/{skuExternalId} with a
 *    skuExternalId that does not match any existing external_id for that SKU
 *    and assert that the call fails.
 * 8. As admin, call GET again with the real external_id string that was created in
 *    step 6 and assert that it succeeds, proving existing mappings are
 *    unaffected.
 */
export async function test_api_admin_sku_external_id_retrieve_not_found_for_unknown_external_id(
  connection: api.IConnection,
) {
  // 1. Register admin and become authenticated
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: "AdminPassw0rd!",
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoin);

  // 2. Register a seller account
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const sellerJoinBody = {
    email: sellerEmail,
    password: "SellerPassw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoin);

  // 3. As seller, create a product
  const productBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.name(1),
    model_name: RandomGenerator.alphaNumeric(8),
    status: "active",
    primary_image_uri:
      "https://cdn.example.com/images/" +
      RandomGenerator.alphaNumeric(16) +
      ".jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 4. As admin, create an inventory state
  const adminLoginBody = {
    email: adminEmail,
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  const inventoryStateBody = {
    code: "in_stock_" + RandomGenerator.alphaNumeric(6),
    name: "In Stock",
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

  // 5. As seller, create an SKU for the product referencing the inventory state
  const sellerLoginBody = {
    email: sellerEmail,
    password: "SellerPassw0rd!",
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  const skuBody = {
    code: "SKU-" + RandomGenerator.alphaNumeric(10),
    barcode: RandomGenerator.alphaNumeric(13),
    status: "active",
    price: 199.99,
    original_price: 249.99,
    inventory_quantity: 50,
    low_stock_threshold: 5,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuBody,
    });
  typia.assert(sku);

  // 6. As admin, create one valid external ID mapping for the SKU
  const adminLoginForExternalId: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginForExternalId);

  const baseExternalId = "ERP-" + RandomGenerator.alphaNumeric(10);

  const externalIdCreateBody = {
    system_code: "ERP_SYSTEM",
    external_id: baseExternalId,
  } satisfies IShoppingMallSkuExternalId.ICreate;

  const createdExternalId: IShoppingMallSkuExternalId =
    await api.functional.shoppingMall.admin.skus.externalIds.create(
      connection,
      {
        skuId: sku.id,
        body: externalIdCreateBody,
      },
    );
  typia.assert(createdExternalId);

  TestValidator.equals(
    "created external id should match requested external_id",
    createdExternalId.external_id,
    baseExternalId,
  );

  // 7. As admin, attempt to retrieve with an unknown external id
  const unknownExternalId = baseExternalId + "__unknown";

  await TestValidator.error(
    "admin retrieval with unknown external id should fail",
    async () => {
      await api.functional.shoppingMall.admin.skus.externalIds.at(connection, {
        skuId: sku.id,
        skuExternalId: unknownExternalId,
      });
    },
  );

  // 8. Confirm that the valid mapping is still retrievable
  const fetchedExisting: IShoppingMallSkuExternalId =
    await api.functional.shoppingMall.admin.skus.externalIds.at(connection, {
      skuId: sku.id,
      skuExternalId: baseExternalId,
    });
  typia.assert(fetchedExisting);

  TestValidator.equals(
    "fetched existing external id should match original created",
    fetchedExisting.external_id,
    createdExternalId.external_id,
  );
}
