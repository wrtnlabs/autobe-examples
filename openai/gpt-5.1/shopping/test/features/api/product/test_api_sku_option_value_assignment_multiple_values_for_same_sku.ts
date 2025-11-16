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
 * Validate SKU option value assignments for multiple option values on the same
 * SKU.
 *
 * Business goal
 *
 * - A seller should be able to model a composite variant (e.g., Color: RED, Size:
 *   M) by attaching multiple option values belonging to different option types
 *   to a single SKU.
 *
 * Flow
 *
 * 1. Register a seller via POST /auth/seller/join and rely on SDK to set auth
 *    header.
 * 2. Create a product with is_multi_sku=true via POST
 *    /shoppingMall/seller/products.
 * 3. Under that product, create two option types (COLOR and SIZE).
 * 4. Under each option type, create one option value (RED and M respectively).
 * 5. Create a SKU (e.g., code "RED-M") under the product.
 * 6. Attach COLOR/RED to the SKU via POST
 *    /shoppingMall/seller/products/{productCode}/skus/{skuCode}/optionValueAssignments.
 * 7. Attach SIZE/M to the same SKU via another POST call.
 *
 * Assertions
 *
 * - Both assignment calls return valid IShoppingMallSkuOptionValueAssignment
 *   objects.
 * - The assignments share productCode and skuCode equal to the created
 *   product.code and sku.code.
 * - The two assignments differ in productOptionTypeCode and
 *   productOptionValueCode.
 * - OrderIndex values are preserved and reflect the requested ordering (e.g., 0
 *   then 1).
 */
export async function test_api_sku_option_value_assignment_multiple_values_for_same_sku(
  connection: api.IConnection,
) {
  // 1. Register seller and let SDK manage Authorization header
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert(seller);

  // 2. Create multi-SKU product
  const productCode: string = `PRD-${RandomGenerator.alphaNumeric(8)}`;
  const productBody = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_brand_id: undefined,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: null,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);
  TestValidator.equals(
    "created product code matches requested code",
    product.code,
    productCode,
  );

  // 3. Create COLOR and SIZE option types for this product
  const colorOptionTypeBody = {
    name: "COLOR",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const colorOptionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: product.code,
        body: colorOptionTypeBody,
      },
    );
  typia.assert(colorOptionType);

  const sizeOptionTypeBody = {
    name: "SIZE",
    display_name: "Size",
    display_order: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const sizeOptionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: product.code,
        body: sizeOptionTypeBody,
      },
    );
  typia.assert(sizeOptionType);

  // 4. Create RED under COLOR and M under SIZE
  const redValueBody = {
    value: "RED",
    display_name: "Red",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const redValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: colorOptionType.id,
        body: redValueBody,
      },
    );
  typia.assert(redValue);

  const mValueBody = {
    value: "M",
    display_name: "M",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const mValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: sizeOptionType.id,
        body: mValueBody,
      },
    );
  typia.assert(mValue);

  // 5. Create a SKU under this product
  const skuCode: string = "RED-M";
  const skuBody = {
    code: skuCode,
    name: "RED / M",
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuBody,
    });
  typia.assert(sku);
  TestValidator.equals(
    "SKU belongs to expected product",
    sku.productCode,
    product.code,
  );
  TestValidator.equals("SKU code matches requested", sku.code, skuCode);

  // 6. Attach COLOR/RED to the SKU
  const colorAssignmentBody = {
    productOptionTypeCode: colorOptionType.name,
    productOptionValueCode: redValue.value,
    orderIndex: 0 as number & tags.Type<"int32">,
  } satisfies IShoppingMallSkuOptionValueAssignment.ICreate;

  const colorAssignment: IShoppingMallSkuOptionValueAssignment =
    await api.functional.shoppingMall.seller.products.skus.optionValueAssignments.create(
      connection,
      {
        productCode: product.code,
        skuCode: sku.code,
        body: colorAssignmentBody,
      },
    );
  typia.assert(colorAssignment);

  // 7. Attach SIZE/M to the same SKU
  const sizeAssignmentBody = {
    productOptionTypeCode: sizeOptionType.name,
    productOptionValueCode: mValue.value,
    orderIndex: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallSkuOptionValueAssignment.ICreate;

  const sizeAssignment: IShoppingMallSkuOptionValueAssignment =
    await api.functional.shoppingMall.seller.products.skus.optionValueAssignments.create(
      connection,
      {
        productCode: product.code,
        skuCode: sku.code,
        body: sizeAssignmentBody,
      },
    );
  typia.assert(sizeAssignment);

  // --- Assertions on assignments ---
  // Both assignments share productCode and skuCode and match the SKU
  TestValidator.equals(
    "color assignment productCode matches product",
    colorAssignment.productCode,
    product.code,
  );
  TestValidator.equals(
    "size assignment productCode matches product",
    sizeAssignment.productCode,
    product.code,
  );
  TestValidator.equals(
    "color assignment skuCode matches SKU",
    colorAssignment.skuCode,
    sku.code,
  );
  TestValidator.equals(
    "size assignment skuCode matches SKU",
    sizeAssignment.skuCode,
    sku.code,
  );

  // Assignments must differ in option type/value codes
  TestValidator.notEquals(
    "option type codes differ between assignments",
    colorAssignment.productOptionTypeCode,
    sizeAssignment.productOptionTypeCode,
  );
  TestValidator.notEquals(
    "option value codes differ between assignments",
    colorAssignment.productOptionValueCode,
    sizeAssignment.productOptionValueCode,
  );

  // orderIndex should reflect requested ordering
  TestValidator.equals(
    "color assignment has orderIndex 0",
    colorAssignment.orderIndex,
    0,
  );
  TestValidator.equals(
    "size assignment has orderIndex 1",
    sizeAssignment.orderIndex,
    1,
  );
}
