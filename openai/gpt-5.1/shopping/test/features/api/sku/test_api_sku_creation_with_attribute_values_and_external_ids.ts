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

export async function test_api_sku_creation_with_attribute_values_and_external_ids(
  connection: api.IConnection,
) {
  // 1. Seller registration (join) -> authenticated seller context
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 2. Admin registration (join) -> authenticated admin context
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
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 3. Seller creates a product
  // Switch connection back to seller (after admin.join last token is admin)
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLogin);

  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    summary: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 3,
      wordMax: 8,
    }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    brand: "AutoBE Brand",
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
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 4. Admin creates category and links it to product
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLogin);

  const categoryCreateBody = {
    parent_id: null,
    slug: "category-" + RandomGenerator.alphaNumeric(8),
    name_en: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 10,
    }),
    description_en: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 3,
      wordMax: 10,
    }),
    status: "active",
    sort_order: 0 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert<IShoppingMallCategory>(category);

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
  typia.assert<IShoppingMallProductCategory>(productCategory);

  // 5. Admin defines a product attribute (e.g., size)
  const attributeCreateBody = {
    name: "size" as string & tags.MinLength<1>,
    display_name: "Size" as string & tags.MinLength<1>,
    data_type: "string" as string & tags.MinLength<1>,
    is_variant_dimension: true,
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductAttribute.ICreate;

  const attribute: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId: product.id,
        body: attributeCreateBody,
      },
    );
  typia.assert<IShoppingMallProductAttribute>(attribute);

  // 6. Seller creates attribute values (e.g., M and L)
  const sellerReloginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerRelogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerReloginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerRelogin);

  const sizeMCreateBody = {
    value: "M",
    display_value: "Medium",
    display_order: 0 as number & tags.Type<"int32">,
  } satisfies IShoppingMallProductAttributeValue.ICreate;

  const sizeM: IShoppingMallProductAttributeValue =
    await api.functional.shoppingMall.seller.products.attributes.values.create(
      connection,
      {
        productId: product.id,
        productAttributeId: attribute.id,
        body: sizeMCreateBody,
      },
    );
  typia.assert<IShoppingMallProductAttributeValue>(sizeM);

  const sizeLCreateBody = {
    value: "L",
    display_value: "Large",
    display_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallProductAttributeValue.ICreate;

  const sizeL: IShoppingMallProductAttributeValue =
    await api.functional.shoppingMall.seller.products.attributes.values.create(
      connection,
      {
        productId: product.id,
        productAttributeId: attribute.id,
        body: sizeLCreateBody,
      },
    );
  typia.assert<IShoppingMallProductAttributeValue>(sizeL);

  // 7. Admin creates an inventory state
  const adminReloginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminRelogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminReloginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminRelogin);

  const inventoryStateCreateBody = {
    code: "in_stock",
    name: "In Stock",
    description: "SKU is fully in stock and purchasable",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: inventoryStateCreateBody,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(inventoryState);

  // 8. Seller creates SKU with attribute_value_ids and multiple external_ids
  const sellerFinalLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerFinalLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerFinalLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerFinalLogin);

  const skuCode = "SKU-" + RandomGenerator.alphaNumeric(8);
  const skuPrice = 199.99;
  const skuOriginalPrice = 249.99;
  const skuInventoryQuantity = 50 as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const skuLowStockThreshold = 5 as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;

  const externalIds: IShoppingMallSkuExternalId.ICreate[] = [
    {
      system_code: "ERP",
      external_id: "ERP-" + RandomGenerator.alphaNumeric(10),
    },
    {
      system_code: "WMS",
      external_id: "WMS-" + RandomGenerator.alphaNumeric(10),
    },
  ];

  const skuCreateBody = {
    code: skuCode,
    barcode: "BAR-" + RandomGenerator.alphaNumeric(12),
    status: "active",
    price: skuPrice,
    original_price: skuOriginalPrice,
    inventory_quantity: skuInventoryQuantity,
    low_stock_threshold: skuLowStockThreshold,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [sizeM.id],
    external_ids: externalIds,
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuCreateBody,
    });
  typia.assert<IShoppingMallSku>(sku);

  // 9. Response validation and business logic checks
  TestValidator.equals(
    "sku product summary id should match created product id",
    sku.product.id,
    product.id,
  );

  TestValidator.equals(
    "sku inventory_state id should match created inventory state id",
    sku.inventory_state.id,
    inventoryState.id,
  );

  TestValidator.equals(
    "sku inventory_state code should match created inventory state code",
    sku.inventory_state.code,
    inventoryState.code,
  );

  TestValidator.equals("sku code should match request body", sku.code, skuCode);
  TestValidator.equals(
    "sku status should match request body",
    sku.status,
    skuCreateBody.status,
  );
  TestValidator.equals(
    "sku price should match request body",
    sku.price,
    skuPrice,
  );
  TestValidator.equals(
    "sku original_price should match request body",
    sku.original_price,
    skuOriginalPrice,
  );
  TestValidator.equals(
    "sku inventory_quantity should match request body",
    sku.inventory_quantity,
    skuInventoryQuantity,
  );
  TestValidator.equals(
    "sku low_stock_threshold should match request body",
    sku.low_stock_threshold,
    skuLowStockThreshold,
  );

  TestValidator.predicate(
    "sku created_at should be a non-empty string",
    typeof sku.created_at === "string" && sku.created_at.length > 0,
  );
  TestValidator.predicate(
    "sku updated_at should be a non-empty string",
    typeof sku.updated_at === "string" && sku.updated_at.length > 0,
  );

  TestValidator.equals(
    "sku deleted_at should be null on creation",
    sku.deleted_at,
    null,
  );

  // 10. Negative/business rule check: duplicate SKU with same code and attribute_value_ids
  await TestValidator.error(
    "duplicate SKU creation with same code and attribute_value_ids should fail",
    async () => {
      const duplicateSkuCreateBody = {
        code: skuCode,
        barcode: "BAR-" + RandomGenerator.alphaNumeric(12),
        status: "active",
        price: skuPrice,
        original_price: skuOriginalPrice,
        inventory_quantity: skuInventoryQuantity,
        low_stock_threshold: skuLowStockThreshold,
        shopping_mall_sku_inventory_state_id: inventoryState.id,
        attribute_value_ids: [sizeM.id],
        external_ids: externalIds,
      } satisfies IShoppingMallSku.ICreate;

      await api.functional.shoppingMall.seller.products.skus.create(
        connection,
        {
          productId: product.id,
          body: duplicateSkuCreateBody,
        },
      );
    },
  );
}
