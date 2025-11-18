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
import type { IShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttribute";
import type { IShoppingMallProductAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttributeValue";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

/**
 * Validate SKU variant attribute and external ID update.
 *
 * Business flow:
 *
 * 1. Seller joins and logs in.
 * 2. Seller creates a base product.
 * 3. Admin joins and logs in.
 * 4. Admin creates a category and links it to the product.
 * 5. Admin creates an inventory state used by the SKU.
 * 6. Admin defines two product attributes (size, color).
 * 7. Seller creates attribute values for size (M, L) and color (Red, Blue).
 * 8. Seller creates an initial SKU with attribute_value_ids for size=M, color=Red,
 *    initial price, status, and one external_ids entry.
 * 9. Admin creates an additional external ID mapping for the same SKU.
 * 10. Seller updates the SKU via PUT, changing:
 *
 *     - Attribute_value_ids to size=L, color=Blue
 *     - External_ids to a new set (treating it as authoritative collection)
 *     - Status and price scalars.
 * 11. Validate that the returned IShoppingMallSku reflects scalar updates and
 *     remains associated to the same product and inventory state.
 */
export async function test_api_sku_update_variant_attributes_and_external_ids(
  connection: api.IConnection,
) {
  // 1. Seller joins
  const sellerJoinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinRequest,
    });
  typia.assert(sellerJoin);

  const sellerEmail: string = sellerJoin.email;

  // 2. Seller login (ensure login flow works and token is set)
  const sellerLoginRequest = {
    email: sellerEmail,
    password: sellerJoinRequest.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginRequest,
    });
  typia.assert(sellerLogin);

  // 3. Seller creates a product
  const productCreate = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "Test Brand",
    model_name: "Model-" + RandomGenerator.alphaNumeric(6),
    status: "active",
    primary_image_uri:
      "https://cdn.example.com/images/" +
      RandomGenerator.alphaNumeric(16) +
      ".jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreate,
    });
  typia.assert(product);

  // 4. Admin joins
  const adminJoinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinRequest,
    });
  typia.assert(adminJoin);

  const adminEmail: string = adminJoin.email;

  // 5. Admin login (switch actor to admin)
  const adminLoginRequest = {
    email: adminEmail,
    password: adminJoinRequest.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginRequest,
    });
  typia.assert(adminLogin);

  // 6. Admin creates a category
  const categoryCreate = {
    parent_id: null,
    slug: "test-category-" + RandomGenerator.alphaNumeric(8),
    name_en: "Test Category",
    description_en: "Category for SKU update E2E test",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreate,
    });
  typia.assert(category);

  // 7. Admin links category to product
  const productCategoryCreate = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryCreate,
      },
    );
  typia.assert(productCategory);

  // 8. Admin creates an inventory state
  const skuInventoryStateCreate = {
    code: "in_stock_" + RandomGenerator.alphaNumeric(6),
    name: "In Stock",
    description: "Purchasable inventory state for E2E test",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const skuInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateCreate,
      },
    );
  typia.assert(skuInventoryState);

  // 9. Admin defines two product attributes (size, color)
  const sizeAttributeCreate = {
    name: "size",
    display_name: "Size",
    data_type: "string",
    is_variant_dimension: true,
    display_order: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductAttribute.ICreate;

  const sizeAttribute: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId: product.id as string & tags.Format<"uuid">,
        body: sizeAttributeCreate,
      },
    );
  typia.assert(sizeAttribute);

  const colorAttributeCreate = {
    name: "color",
    display_name: "Color",
    data_type: "string",
    is_variant_dimension: true,
    display_order: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductAttribute.ICreate;

  const colorAttribute: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId: product.id as string & tags.Format<"uuid">,
        body: colorAttributeCreate,
      },
    );
  typia.assert(colorAttribute);

  // 10. Switch back to seller for attribute values and SKU operations
  const sellerReLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginRequest,
    });
  typia.assert(sellerReLogin);

  // 11. Seller creates attribute values for size (M, L)
  const sizeMCreate = {
    value: "M",
    display_value: "Medium",
    display_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallProductAttributeValue.ICreate;

  const sizeM: IShoppingMallProductAttributeValue =
    await api.functional.shoppingMall.seller.products.attributes.values.create(
      connection,
      {
        productId: product.id as string & tags.Format<"uuid">,
        productAttributeId: sizeAttribute.id as string & tags.Format<"uuid">,
        body: sizeMCreate,
      },
    );
  typia.assert(sizeM);

  const sizeLCreate = {
    value: "L",
    display_value: "Large",
    display_order: 2 as number & tags.Type<"int32">,
  } satisfies IShoppingMallProductAttributeValue.ICreate;

  const sizeL: IShoppingMallProductAttributeValue =
    await api.functional.shoppingMall.seller.products.attributes.values.create(
      connection,
      {
        productId: product.id as string & tags.Format<"uuid">,
        productAttributeId: sizeAttribute.id as string & tags.Format<"uuid">,
        body: sizeLCreate,
      },
    );
  typia.assert(sizeL);

  // 12. Seller creates attribute values for color (Red, Blue)
  const colorRedCreate = {
    value: "RED",
    display_value: "Red",
    display_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallProductAttributeValue.ICreate;

  const colorRed: IShoppingMallProductAttributeValue =
    await api.functional.shoppingMall.seller.products.attributes.values.create(
      connection,
      {
        productId: product.id as string & tags.Format<"uuid">,
        productAttributeId: colorAttribute.id as string & tags.Format<"uuid">,
        body: colorRedCreate,
      },
    );
  typia.assert(colorRed);

  const colorBlueCreate = {
    value: "BLUE",
    display_value: "Blue",
    display_order: 2 as number & tags.Type<"int32">,
  } satisfies IShoppingMallProductAttributeValue.ICreate;

  const colorBlue: IShoppingMallProductAttributeValue =
    await api.functional.shoppingMall.seller.products.attributes.values.create(
      connection,
      {
        productId: product.id as string & tags.Format<"uuid">,
        productAttributeId: colorAttribute.id as string & tags.Format<"uuid">,
        body: colorBlueCreate,
      },
    );
  typia.assert(colorBlue);

  // 13. Seller creates initial SKU with size=M, color=Red and one external id
  const initialExternalIdCreate = {
    system_code: "WMS",
    external_id: "WMS-" + RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSkuExternalId.ICreate;

  const skuCreate = {
    code: "SKU-" + RandomGenerator.alphaNumeric(8),
    barcode: "BAR" + RandomGenerator.alphaNumeric(10),
    status: "active",
    price: 10000,
    original_price: 12000,
    inventory_quantity: 50 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [
      sizeM.id as string & tags.Format<"uuid">,
      colorRed.id as string & tags.Format<"uuid">,
    ],
    external_ids: [initialExternalIdCreate],
  } satisfies IShoppingMallSku.ICreate;

  const initialSku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuCreate,
    });
  typia.assert(initialSku);

  // Sanity validations on created SKU
  TestValidator.equals(
    "created SKU belongs to product",
    initialSku.product.id,
    product.id,
  );
  TestValidator.equals(
    "created SKU uses inventory state",
    initialSku.inventory_state.id,
    skuInventoryState.id,
  );

  const originalPrice: number = initialSku.price;
  const originalStatus: string = initialSku.status;

  // 14. Admin creates an additional external ID for the same SKU
  const adminRelogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginRequest,
    });
  typia.assert(adminRelogin);

  const additionalExternalIdCreate = {
    system_code: "ERP",
    external_id: "ERP-" + RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSkuExternalId.ICreate;

  const additionalExternalId: IShoppingMallSkuExternalId =
    await api.functional.shoppingMall.admin.skus.externalIds.create(
      connection,
      {
        skuId: initialSku.id,
        body: additionalExternalIdCreate,
      },
    );
  typia.assert(additionalExternalId);

  // 15. Seller logs in again to perform the SKU update
  const sellerFinalLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginRequest,
    });
  typia.assert(sellerFinalLogin);

  // 16. Prepare SKU update: change attributes, status, price, and external IDs
  const updatedPrice = originalPrice + 500;
  const updatedStatus = originalStatus + "_updated";

  const updatedExternalIds: IShoppingMallSkuExternalId.IUpdate[] = [
    {
      system_code: initialExternalIdCreate.system_code + "_NEW",
      external_id: initialExternalIdCreate.external_id + "-UPD",
    },
    {
      system_code: additionalExternalIdCreate.system_code + "_NEW",
      external_id: additionalExternalIdCreate.external_id + "-UPD",
    },
  ];

  const skuUpdateBody = {
    status: updatedStatus,
    price: updatedPrice,
    attribute_value_ids: [
      sizeL.id as string & tags.Format<"uuid">,
      colorBlue.id as string & tags.Format<"uuid">,
    ],
    external_ids: updatedExternalIds,
  } satisfies IShoppingMallSku.IUpdate;

  const updatedSku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.update(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      skuId: initialSku.id as string & tags.Format<"uuid">,
      body: skuUpdateBody,
    });
  typia.assert(updatedSku);

  // 17. Validate that SKU identity and product association are preserved
  TestValidator.equals(
    "SKU id remains unchanged after update",
    updatedSku.id,
    initialSku.id,
  );
  TestValidator.equals(
    "SKU still belongs to same product after update",
    updatedSku.product.id,
    product.id,
  );

  // 18. Validate scalar changes
  TestValidator.equals("SKU status updated", updatedSku.status, updatedStatus);
  TestValidator.equals("SKU price updated", updatedSku.price, updatedPrice);

  // 19. Validate inventory state still attached (since we did not change it)
  TestValidator.equals(
    "inventory state remains the same",
    updatedSku.inventory_state.id,
    initialSku.inventory_state.id,
  );
}
