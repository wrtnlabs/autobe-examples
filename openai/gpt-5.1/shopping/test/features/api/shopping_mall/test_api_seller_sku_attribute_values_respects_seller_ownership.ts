import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSkuAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSkuAttributeValue";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttribute";
import type { IShoppingMallProductAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttributeValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuAttributeValue";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

export async function test_api_seller_sku_attribute_values_respects_seller_ownership(
  connection: api.IConnection,
) {
  // 1. Register seller A
  const sellerAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerAPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const sellerAJoinBody = {
    email: sellerAEmail,
    password: sellerAPassword,
    ip: null,
    href: "https://seller-a.join/" as string & tags.Format<"uri">,
    referrer: "https://seller-a.referrer/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerA: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerAJoinBody,
    });
  typia.assert(sellerA);

  // 2. Register seller B
  const sellerBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerBPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const sellerBJoinBody = {
    email: sellerBEmail,
    password: sellerBPassword,
    ip: null,
    href: "https://seller-b.join/" as string & tags.Format<"uri">,
    referrer: "https://seller-b.referrer/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerB: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBJoinBody,
    });
  typia.assert(sellerB);

  // 3. Register admin
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
    href: "https://admin.join/" as string & tags.Format<"uri">,
    referrer: "https://admin.referrer/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 4. Explicitly login as seller A (ensures seller context)
  const sellerALoginBody = {
    email: sellerAEmail,
    password: sellerAPassword,
    ip: null,
    href: "https://seller-a.login/" as string & tags.Format<"uri">,
    referrer: "https://seller-a.login.referrer/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerALogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerALoginBody,
    });
  typia.assert(sellerALogin);

  // 5. Seller A creates productA
  const productACreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    summary: RandomGenerator.paragraph({
      sentences: 5,
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
    brand: null,
    model_name: null,
    status: "active",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productACreateBody,
    });
  typia.assert(productA);

  // 6. Login as admin to create product attribute
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.login/" as string & tags.Format<"uri">,
    referrer: "https://admin.login.referrer/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  const attributeCreateBody = {
    name: "color" as string & tags.MinLength<1>,
    display_name: "Color" as string & tags.MinLength<1>,
    data_type: "string" as string & tags.MinLength<1>,
    is_variant_dimension: true,
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductAttribute.ICreate;

  const productAttribute: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId: productA.id,
        body: attributeCreateBody,
      },
    );
  typia.assert(productAttribute);

  // 7. Login back as seller A and create an attribute value under that attribute
  const sellerALogin2: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerALoginBody,
    });
  typia.assert(sellerALogin2);

  const attributeValueCreateBody = {
    value: "red",
    display_value: "Red",
    display_order: 0 as number & tags.Type<"int32">,
  } satisfies IShoppingMallProductAttributeValue.ICreate;

  const productAttributeValue: IShoppingMallProductAttributeValue =
    await api.functional.shoppingMall.seller.products.attributes.values.create(
      connection,
      {
        productId: productA.id,
        productAttributeId: productAttribute.id,
        body: attributeValueCreateBody,
      },
    );
  typia.assert(productAttributeValue);

  // 8. Login as admin and create an inventory state
  const adminLogin2: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin2);

  const inventoryStateCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: "In Stock",
    description: null,
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

  // 9. Login as seller A and create a SKU for productA
  const sellerALogin3: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerALoginBody,
    });
  typia.assert(sellerALogin3);

  const skuCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    barcode: null,
    status: "active",
    price: 100,
    original_price: null,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: null,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: undefined,
    external_ids: undefined,
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: productA.id,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 10. Seller A links the SKU to the attribute value
  const skuAttrCreateBody = {
    shopping_mall_product_attribute_value_id: productAttributeValue.id,
  } satisfies IShoppingMallSkuAttributeValue.ICreate;

  const skuAttr: IShoppingMallSkuAttributeValue =
    await api.functional.shoppingMall.seller.skus.attributeValues.create(
      connection,
      {
        skuId: sku.id,
        body: skuAttrCreateBody,
      },
    );
  typia.assert(skuAttr);
  TestValidator.equals(
    "linked SKU should match created SKU",
    skuAttr.shopping_mall_sku_id,
    sku.id,
  );
  TestValidator.equals(
    "linked attribute value should match created value",
    skuAttr.shopping_mall_product_attribute_value_id,
    productAttributeValue.id,
  );

  // 11. Positive control: seller A lists attribute values for their own SKU
  const listRequestBodyForSellerA = {
    page: 1 as number & tags.Type<"int32">,
    pageSize: 10 as number & tags.Type<"int32">,
    shopping_mall_product_attribute_value_id: undefined,
    created_from: undefined,
    created_to: undefined,
    updated_from: undefined,
    updated_to: undefined,
  } satisfies IShoppingMallSkuAttributeValue.IRequest;

  const listForSellerA: IPageIShoppingMallSkuAttributeValue.ISummary =
    await api.functional.shoppingMall.seller.skus.attributeValues.index(
      connection,
      {
        skuId: sku.id,
        body: listRequestBodyForSellerA,
      },
    );
  typia.assert(listForSellerA);

  TestValidator.predicate(
    "seller A should see at least one attribute value link for their SKU",
    listForSellerA.data.length > 0,
  );

  const allSkuIdsMatch = listForSellerA.data.every(
    (summary) => summary.shopping_mall_sku_id === sku.id,
  );
  TestValidator.predicate(
    "all listed entries for seller A should belong to skuA",
    allSkuIdsMatch,
  );

  const hasLinkedValueForSellerA = listForSellerA.data.some(
    (summary) =>
      summary.shopping_mall_product_attribute_value_id ===
      productAttributeValue.id,
  );
  TestValidator.predicate(
    "seller A listing should include the created attribute value link",
    hasLinkedValueForSellerA,
  );

  // 12. Negative scenario: seller B attempts to list attribute values for seller A's SKU
  const sellerBLoginBody = {
    email: sellerBEmail,
    password: sellerBPassword,
    ip: null,
    href: "https://seller-b.login/" as string & tags.Format<"uri">,
    referrer: "https://seller-b.login.referrer/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerBLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerBLoginBody,
    });
  typia.assert(sellerBLogin);

  const listRequestBodyForSellerB = {
    page: 1 as number & tags.Type<"int32">,
    pageSize: 10 as number & tags.Type<"int32">,
    shopping_mall_product_attribute_value_id: undefined,
    created_from: undefined,
    created_to: undefined,
    updated_from: undefined,
    updated_to: undefined,
  } satisfies IShoppingMallSkuAttributeValue.IRequest;

  await TestValidator.error(
    "seller B must not be able to list attribute values for seller A's SKU",
    async () => {
      await api.functional.shoppingMall.seller.skus.attributeValues.index(
        connection,
        {
          skuId: sku.id,
          body: listRequestBodyForSellerB,
        },
      );
    },
  );
}
