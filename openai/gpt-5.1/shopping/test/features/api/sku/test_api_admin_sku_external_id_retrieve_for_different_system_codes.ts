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
 * Validate retrieval of SKU external IDs for different system codes.
 *
 * Business goal: Ensure that when a single SKU has multiple external identifier
 * mappings (for example, one for an ERP system and another for a marketplace
 * system), the admin lookup endpoint `GET
 * /shoppingMall/admin/skus/{skuId}/externalIds/{skuExternalId}` correctly
 * resolves the mapping for the given skuId + skuExternalId pair, and does not
 * confuse mappings with other system_code values.
 *
 * High level flow:
 *
 * 1. Register an admin and establish admin authentication.
 * 2. Register a seller and establish seller authentication.
 * 3. As seller, create a product.
 * 4. As admin, create a category and attach the product to that category.
 * 5. As admin, create a SKU inventory state configuration.
 * 6. As seller, create a SKU for the product, referencing the inventory state.
 * 7. As admin, create two external ID mappings for the SKU:
 *
 *    - ERP mapping with external_id "ERP-111".
 *    - MARKETPLACE mapping with external_id "MKP-222".
 * 8. Retrieve the ERP mapping by calling the GET endpoint with skuExternalId
 *    "ERP-111" and validate that system_code and external_id match and that it
 *    is distinct from the MARKETPLACE mapping.
 * 9. Retrieve the MARKETPLACE mapping with skuExternalId "MKP-222" and perform
 *    equivalent validations.
 *
 * This end-to-end test exercises cross-actor flows (admin and seller), SKU
 * creation, external ID creation, and precise retrieval semantics for SKU
 * external identifiers when system_code values differ.
 */
export async function test_api_admin_sku_external_id_retrieve_for_different_system_codes(
  connection: api.IConnection,
) {
  // 1. Admin joins (creates admin account and authenticates)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://admin.shoppingmall.test/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoined: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoined);

  // 2. Seller joins (switches connection auth to seller)
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword: string = RandomGenerator.alphaNumeric(12);

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.shoppingmall.test/join",
    referrer: "https://seller.shoppingmall.test/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerJoined: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoined);

  // 3. Seller creates a product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.name(1),
    model_name: RandomGenerator.alphaNumeric(6),
    status: "active",
    primary_image_uri:
      "https://cdn.shoppingmall.test/images/" +
      RandomGenerator.alphaNumeric(16),
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 4. Switch back to admin via login
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.shoppingmall.test/login",
    referrer: "https://admin.shoppingmall.test/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 5. Admin creates a category
  const categoryCreateBody = {
    parent_id: null,
    slug: "cat-" + RandomGenerator.alphaNumeric(8),
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

  // 6. Admin attaches product to category
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

  // 7. Admin creates a SKU inventory state
  const inventoryStateCreateBody = {
    code: "in_stock_" + RandomGenerator.alphaNumeric(6),
    name: "In Stock",
    description: "Standard sellable inventory state for testing.",
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

  // 8. Switch to seller via login before creating SKU
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.shoppingmall.test/login",
    referrer: "https://seller.shoppingmall.test/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // 9. Seller creates a SKU under the product using the inventory state
  const skuCreateBody = {
    code: "SKU-" + RandomGenerator.alphaNumeric(8),
    barcode: RandomGenerator.alphaNumeric(13),
    status: "active",
    price: 19990,
    original_price: 24990,
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

  // 10. Switch back to admin to create external IDs
  const adminLoggedInAgain: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedInAgain);

  // Create ERP external ID
  const erpExternalIdValue = "ERP-111";
  const erpExternalIdCreateBody = {
    system_code: "ERP",
    external_id: erpExternalIdValue,
  } satisfies IShoppingMallSkuExternalId.ICreate;

  const erpExternalId: IShoppingMallSkuExternalId =
    await api.functional.shoppingMall.admin.skus.externalIds.create(
      connection,
      {
        skuId: sku.id,
        body: erpExternalIdCreateBody,
      },
    );
  typia.assert(erpExternalId);

  // Create MARKETPLACE external ID
  const marketplaceExternalIdValue = "MKP-222";
  const marketplaceExternalIdCreateBody = {
    system_code: "MARKETPLACE",
    external_id: marketplaceExternalIdValue,
  } satisfies IShoppingMallSkuExternalId.ICreate;

  const marketplaceExternalId: IShoppingMallSkuExternalId =
    await api.functional.shoppingMall.admin.skus.externalIds.create(
      connection,
      {
        skuId: sku.id,
        body: marketplaceExternalIdCreateBody,
      },
    );
  typia.assert(marketplaceExternalId);

  // 11. Retrieve ERP mapping via GET endpoint and validate
  const gotErpExternalId: IShoppingMallSkuExternalId =
    await api.functional.shoppingMall.admin.skus.externalIds.at(connection, {
      skuId: sku.id,
      skuExternalId: erpExternalIdValue,
    });
  typia.assert(gotErpExternalId);

  TestValidator.equals(
    "ERP external id mapping: system_code should be ERP",
    gotErpExternalId.system_code,
    "ERP",
  );
  TestValidator.equals(
    "ERP external id mapping: external_id should be ERP-111",
    gotErpExternalId.external_id,
    erpExternalIdValue,
  );
  TestValidator.notEquals(
    "ERP mapping external_id should differ from MARKETPLACE external_id",
    gotErpExternalId.external_id,
    marketplaceExternalId.external_id,
  );

  // 12. Retrieve MARKETPLACE mapping via GET endpoint and validate
  const gotMarketplaceExternalId: IShoppingMallSkuExternalId =
    await api.functional.shoppingMall.admin.skus.externalIds.at(connection, {
      skuId: sku.id,
      skuExternalId: marketplaceExternalIdValue,
    });
  typia.assert(gotMarketplaceExternalId);

  TestValidator.equals(
    "MARKETPLACE external id mapping: system_code should be MARKETPLACE",
    gotMarketplaceExternalId.system_code,
    "MARKETPLACE",
  );
  TestValidator.equals(
    "MARKETPLACE external id mapping: external_id should be MKP-222",
    gotMarketplaceExternalId.external_id,
    marketplaceExternalIdValue,
  );
  TestValidator.notEquals(
    "MARKETPLACE mapping external_id should differ from ERP external_id",
    gotMarketplaceExternalId.external_id,
    erpExternalId.external_id,
  );

  // 13. Ensure the two mappings themselves are distinct records
  TestValidator.notEquals(
    "ERP and MARKETPLACE external id records should not be identical",
    gotErpExternalId,
    gotMarketplaceExternalId,
  );
}
