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
import type { IShoppingMallSkuAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuAttributeValue";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

export async function test_api_sku_attribute_value_update_with_mismatched_sku(
  connection: api.IConnection,
) {
  // 1. Admin and seller setup
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: "https://admin.example.com/join",
      referrer: "https://admin.example.com/",
    } satisfies IShoppingMallAdminJoin.ICreate,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminJoin);

  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/",
    } satisfies IShoppingMallAdminLogin.ICreate,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLogin);

  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: null,
      href: "https://seller.example.com/join",
      referrer: "https://seller.example.com/",
    } satisfies IShoppingMallSellerAuthJoin.IRequest,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerJoin);

  // 2. Admin creates shared category and inventory state
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/",
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: null,
        slug: RandomGenerator.alphabets(10),
        name_en: RandomGenerator.paragraph({ sentences: 1 }),
        description_en: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        sort_order: 0 as number & tags.Type<"int32">,
        is_leaf: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphabets(8),
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_purchasable: true,
        } satisfies IShoppingMallSkuInventoryState.ICreate,
      },
    );
  typia.assert(inventoryState);

  // 3. Product A, attribute, value, skuA, and skuA attribute association
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: null,
      href: "https://seller.example.com/login",
      referrer: "https://seller.example.com/",
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(12),
        title: RandomGenerator.paragraph({ sentences: 1 }),
        summary: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        brand: RandomGenerator.paragraph({ sentences: 1 }),
        model_name: RandomGenerator.paragraph({ sentences: 1 }),
        status: "active",
        primary_image_uri: "https://cdn.example.com/image-a.jpg" as string &
          tags.Format<"uri">,
        default_locale: "en-US",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(productA);

  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/",
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const productACategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: productA.id,
        body: {
          shopping_mall_category_id: category.id,
          is_primary: true,
        } satisfies IShoppingMallProductCategory.ICreate,
      },
    );
  typia.assert(productACategory);

  const productAAttribute: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId: productA.id,
        body: {
          name: RandomGenerator.alphabets(8) as string & tags.MinLength<1>,
          display_name: RandomGenerator.paragraph({
            sentences: 1,
          }) as string & tags.MinLength<1>,
          data_type: "string" as string & tags.MinLength<1>,
          is_variant_dimension: true,
          display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
        } satisfies IShoppingMallProductAttribute.ICreate,
      },
    );
  typia.assert(productAAttribute);

  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: null,
      href: "https://seller.example.com/login",
      referrer: "https://seller.example.com/",
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const productAAttributeValue: IShoppingMallProductAttributeValue =
    await api.functional.shoppingMall.seller.products.attributes.values.create(
      connection,
      {
        productId: productA.id,
        productAttributeId: productAAttribute.id,
        body: {
          value: RandomGenerator.alphabets(5),
          display_value: RandomGenerator.paragraph({ sentences: 1 }),
          display_order: 0 as number & tags.Type<"int32">,
        } satisfies IShoppingMallProductAttributeValue.ICreate,
      },
    );
  typia.assert(productAAttributeValue);

  const skuA: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: productA.id,
      body: {
        code: RandomGenerator.alphaNumeric(10) as string &
          tags.MinLength<1> &
          tags.MaxLength<255>,
        barcode: RandomGenerator.alphaNumeric(13) as string &
          tags.MinLength<1> &
          tags.MaxLength<255>,
        status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
        price: 100 as number & tags.Minimum<0>,
        original_price: 120 as number & tags.Minimum<0>,
        inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
        low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
        shopping_mall_sku_inventory_state_id: inventoryState.id,
        attribute_value_ids: [productAAttributeValue.id] satisfies (string &
          tags.Format<"uuid">)[],
        external_ids: [],
      } satisfies IShoppingMallSku.ICreate,
    });
  typia.assert(skuA);

  const skuAAttributeValueLink: IShoppingMallSkuAttributeValue =
    await api.functional.shoppingMall.seller.skus.attributeValues.create(
      connection,
      {
        skuId: skuA.id,
        body: {
          shopping_mall_product_attribute_value_id: productAAttributeValue.id,
        } satisfies IShoppingMallSkuAttributeValue.ICreate,
      },
    );
  typia.assert(skuAAttributeValueLink);

  TestValidator.equals(
    "skuA attribute link must point to skuA",
    skuAAttributeValueLink.shopping_mall_sku_id,
    skuA.id,
  );

  // 4. Product B and skuB setup
  const productB: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(12),
        title: RandomGenerator.paragraph({ sentences: 1 }),
        summary: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        brand: RandomGenerator.paragraph({ sentences: 1 }),
        model_name: RandomGenerator.paragraph({ sentences: 1 }),
        status: "active",
        primary_image_uri: "https://cdn.example.com/image-b.jpg" as string &
          tags.Format<"uri">,
        default_locale: "en-US",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(productB);

  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/",
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const productBCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: productB.id,
        body: {
          shopping_mall_category_id: category.id,
          is_primary: true,
        } satisfies IShoppingMallProductCategory.ICreate,
      },
    );
  typia.assert(productBCategory);

  const productBAttribute: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId: productB.id,
        body: {
          name: RandomGenerator.alphabets(8) as string & tags.MinLength<1>,
          display_name: RandomGenerator.paragraph({
            sentences: 1,
          }) as string & tags.MinLength<1>,
          data_type: "string" as string & tags.MinLength<1>,
          is_variant_dimension: true,
          display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
        } satisfies IShoppingMallProductAttribute.ICreate,
      },
    );
  typia.assert(productBAttribute);

  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: null,
      href: "https://seller.example.com/login",
      referrer: "https://seller.example.com/",
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const productBAttributeValue: IShoppingMallProductAttributeValue =
    await api.functional.shoppingMall.seller.products.attributes.values.create(
      connection,
      {
        productId: productB.id,
        productAttributeId: productBAttribute.id,
        body: {
          value: RandomGenerator.alphabets(5),
          display_value: RandomGenerator.paragraph({ sentences: 1 }),
          display_order: 0 as number & tags.Type<"int32">,
        } satisfies IShoppingMallProductAttributeValue.ICreate,
      },
    );
  typia.assert(productBAttributeValue);

  const skuB: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: productB.id,
      body: {
        code: RandomGenerator.alphaNumeric(10) as string &
          tags.MinLength<1> &
          tags.MaxLength<255>,
        barcode: RandomGenerator.alphaNumeric(13) as string &
          tags.MinLength<1> &
          tags.MaxLength<255>,
        status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
        price: 200 as number & tags.Minimum<0>,
        original_price: 250 as number & tags.Minimum<0>,
        inventory_quantity: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
        low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
        shopping_mall_sku_inventory_state_id: inventoryState.id,
        attribute_value_ids: [productBAttributeValue.id] satisfies (string &
          tags.Format<"uuid">)[],
        external_ids: [],
      } satisfies IShoppingMallSku.ICreate,
    });
  typia.assert(skuB);

  TestValidator.notEquals("skuA and skuB must be different", skuA.id, skuB.id);

  // 5. Attempt mismatched update and expect error
  await TestValidator.error(
    "updating sku attribute value with mismatched skuId must fail",
    async () => {
      await api.functional.shoppingMall.seller.skus.attributeValues.update(
        connection,
        {
          skuId: skuB.id,
          skuAttributeValueId: skuAAttributeValueLink.id,
          body: {} satisfies IShoppingMallSkuAttributeValue.IUpdate,
        },
      );
    },
  );

  // 6. Logical post-condition checks using in-memory data
  TestValidator.equals(
    "skuA attribute association remains bound to skuA",
    skuAAttributeValueLink.shopping_mall_sku_id,
    skuA.id,
  );
}
