import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSkuOptionValueAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOptionValueAssignment";

/**
 * Validate catalog product details for a multi-SKU variant product.
 *
 * Business goal:
 *
 * - Ensure that a product configured as multi-SKU through seller-side catalog
 *   APIs is correctly exposed via the public catalog details endpoint.
 * - Even though IShoppingMallProduct does not expose the full variant graph
 *   (option types, values, SKUs, assignments), the endpoint must remain stable
 *   and correctly reflect core product attributes such as code, status,
 *   ownership, multi-SKU flag, and timestamps after all variant configuration
 *   steps.
 *
 * Steps:
 *
 * 1. Register a seller using POST /auth/seller/join to obtain an authenticated
 *    seller context.
 * 2. Create a product with is_multi_sku=true and status="active" using POST
 *    /shoppingMall/seller/products.
 * 3. Create two option types for the product via POST
 *    /shoppingMall/seller/products/{productCode}/optionTypes (Color and Size).
 * 4. For each option type, create multiple option values via POST
 *    /shoppingMall/seller/products/{productCode}/optionTypes/{productOptionTypeId}/values
 *    (Color: RED, BLUE; Size: S, M).
 * 5. Create four SKUs for all combinations via POST
 *    /shoppingMall/seller/products/{productCode}/skus.
 * 6. For each SKU, create option value assignments via POST
 *    /shoppingMall/seller/products/{productCode}/skus/{skuCode}/optionValueAssignments
 *    so that each SKU is linked to the appropriate option values using
 *    productOptionTypeCode/productOptionValueCode strings.
 * 7. Call GET /shoppingMall/catalog/products/{productCode}/details.
 * 8. Assert that the response is a valid IShoppingMallProduct and that core fields
 *    (code, is_multi_sku, status, seller summary and timestamps) are consistent
 *    with the created data.
 *
 * Note:
 *
 * - The test intentionally does not attempt to assert variant collections (option
 *   types, option values, SKUs, or assignments) because those are not part of
 *   the IShoppingMallProduct response type for the details endpoint. The focus
 *   is on ensuring that a richly configured multi-SKU product does not break
 *   the details endpoint and that basic product metadata remains correct.
 */
export async function test_api_catalog_product_details_multi_sku_variants(
  connection: api.IConnection,
) {
  // 1. Register seller and obtain authenticated seller context
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 2. Create base multi-SKU product owned by this seller
  const productCode: string = `PRD-${RandomGenerator.alphaNumeric(12)}`;
  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: undefined,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: undefined,
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  TestValidator.equals(
    "created product code matches input code",
    product.code,
    productCode,
  );
  TestValidator.predicate(
    "product is marked as multi-SKU",
    product.is_multi_sku === true,
  );
  TestValidator.equals("product status is active", product.status, "active");

  // 3. Define option types: Color and Size
  const colorOptionTypeBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const colorOptionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode,
        body: colorOptionTypeBody,
      },
    );
  typia.assert(colorOptionType);

  const sizeOptionTypeBody = {
    name: "Size",
    display_name: "Size",
    display_order: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const sizeOptionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode,
        body: sizeOptionTypeBody,
      },
    );
  typia.assert(sizeOptionType);

  // 4. Create option values for Color and Size
  const redOptionValueBody = {
    value: "RED",
    display_name: "Red",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const redOptionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode,
        productOptionTypeId: colorOptionType.id,
        body: redOptionValueBody,
      },
    );
  typia.assert(redOptionValue);

  const blueOptionValueBody = {
    value: "BLUE",
    display_name: "Blue",
    display_order: 1 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const blueOptionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode,
        productOptionTypeId: colorOptionType.id,
        body: blueOptionValueBody,
      },
    );
  typia.assert(blueOptionValue);

  const smallOptionValueBody = {
    value: "S",
    display_name: "Small",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const smallOptionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode,
        productOptionTypeId: sizeOptionType.id,
        body: smallOptionValueBody,
      },
    );
  typia.assert(smallOptionValue);

  const mediumOptionValueBody = {
    value: "M",
    display_name: "Medium",
    display_order: 1 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const mediumOptionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode,
        productOptionTypeId: sizeOptionType.id,
        body: mediumOptionValueBody,
      },
    );
  typia.assert(mediumOptionValue);

  // 5. Create SKUs for all combinations (RED/S, RED/M, BLUE/S, BLUE/M)
  const baseCurrency = "USD";

  const skuRedSBody = {
    code: `${productCode}-RED-S`,
    name: `${product.name} RED S`,
    listPrice: 100,
    salePrice: 90,
    currency: baseCurrency,
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const skuRedS: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode,
      body: skuRedSBody,
    });
  typia.assert(skuRedS);

  const skuRedMBody = {
    code: `${productCode}-RED-M`,
    name: `${product.name} RED M`,
    listPrice: 110,
    salePrice: 100,
    currency: baseCurrency,
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const skuRedM: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode,
      body: skuRedMBody,
    });
  typia.assert(skuRedM);

  const skuBlueSBody = {
    code: `${productCode}-BLUE-S`,
    name: `${product.name} BLUE S`,
    listPrice: 120,
    salePrice: 110,
    currency: baseCurrency,
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const skuBlueS: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode,
      body: skuBlueSBody,
    });
  typia.assert(skuBlueS);

  const skuBlueMBody = {
    code: `${productCode}-BLUE-M`,
    name: `${product.name} BLUE M`,
    listPrice: 130,
    salePrice: 120,
    currency: baseCurrency,
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const skuBlueM: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode,
      body: skuBlueMBody,
    });
  typia.assert(skuBlueM);

  // 6. Create SKU option value assignments (using string codes for type/value)
  const colorTypeCode = colorOptionType.name;
  const sizeTypeCode = sizeOptionType.name;

  const redValueCode = redOptionValue.value;
  const blueValueCode = blueOptionValue.value;
  const smallValueCode = smallOptionValue.value;
  const mediumValueCode = mediumOptionValue.value;

  const assignSku = async (
    sku: IShoppingMallProductSku,
    colorCode: string,
    sizeCode: string,
  ) => {
    const colorAssignmentBody = {
      productOptionTypeCode: colorTypeCode,
      productOptionValueCode: colorCode,
      orderIndex: 0 as number & tags.Type<"int32">,
    } satisfies IShoppingMallSkuOptionValueAssignment.ICreate;

    const colorAssignment: IShoppingMallSkuOptionValueAssignment =
      await api.functional.shoppingMall.seller.products.skus.optionValueAssignments.create(
        connection,
        {
          productCode,
          skuCode: sku.code,
          body: colorAssignmentBody,
        },
      );
    typia.assert(colorAssignment);

    const sizeAssignmentBody = {
      productOptionTypeCode: sizeTypeCode,
      productOptionValueCode: sizeCode,
      orderIndex: 1 as number & tags.Type<"int32">,
    } satisfies IShoppingMallSkuOptionValueAssignment.ICreate;

    const sizeAssignment: IShoppingMallSkuOptionValueAssignment =
      await api.functional.shoppingMall.seller.products.skus.optionValueAssignments.create(
        connection,
        {
          productCode,
          skuCode: sku.code,
          body: sizeAssignmentBody,
        },
      );
    typia.assert(sizeAssignment);
  };

  await assignSku(skuRedS, redValueCode, smallValueCode);
  await assignSku(skuRedM, redValueCode, mediumValueCode);
  await assignSku(skuBlueS, blueValueCode, smallValueCode);
  await assignSku(skuBlueM, blueValueCode, mediumValueCode);

  // 7. Call catalog product details endpoint for this product
  const details: IShoppingMallProduct =
    await api.functional.shoppingMall.catalog.products.details.at(connection, {
      productCode,
    });
  typia.assert(details);

  // 8. Validate core fields of the details response
  TestValidator.equals(
    "details product code matches created product",
    details.code,
    product.code,
  );
  TestValidator.predicate(
    "details is_multi_sku matches created product",
    details.is_multi_sku === product.is_multi_sku,
  );
  TestValidator.equals(
    "details status matches created product",
    details.status,
    product.status,
  );

  TestValidator.equals(
    "details seller id matches seller",
    details.seller.id,
    sellerAuthorized.seller.id,
  );
  TestValidator.equals(
    "details seller email matches seller",
    details.seller.email,
    sellerAuthorized.seller.email,
  );
  TestValidator.equals(
    "details seller store name matches seller",
    details.seller.store_name,
    sellerAuthorized.seller.store_name,
  );

  TestValidator.predicate(
    "details created_at is non-empty string",
    typeof details.created_at === "string" && details.created_at.length > 0,
  );
  TestValidator.predicate(
    "details updated_at is non-empty string",
    typeof details.updated_at === "string" && details.updated_at.length > 0,
  );

  TestValidator.predicate(
    "details deleted_at is null or undefined",
    details.deleted_at === null || details.deleted_at === undefined,
  );
}
