import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";
import type { IShoppingMallSkuOptionValueAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOptionValueAssignment";

/**
 * Validate seller-facing detail retrieval of a SKU option value assignment.
 *
 * Business context: A seller manages a multi-SKU product where each SKU is
 * defined by option types and option values (e.g., Size: L). The seller can
 * create option value assignments that bind a SKU to a concrete option value.
 * This test verifies that, once such an assignment exists, the seller can
 * retrieve its details using the seller detail endpoint, and that the retrieved
 * data is consistent with what was created.
 *
 * Steps:
 *
 * 1. Bootstrap a platform admin (join + login) to allow realistic brand creation.
 * 2. As platform admin, create a brand.
 * 3. Bootstrap a seller (join). The SDK automatically stores the seller token on
 *    the connection.
 * 4. As that seller, create a multi-SKU product belonging to the seller,
 *    optionally attached to the created brand.
 * 5. Create a product option type (e.g. "Size") under this product.
 * 6. Create a product option value (e.g. "L") associated with that option type.
 * 7. Create a SKU for the product using a unique business skuCode.
 * 8. Create a SKU option value assignment linking the SKU and the option value via
 *    their business codes.
 * 9. Call the detail endpoint for that assignment as the same seller.
 * 10. Assert the response conforms to IShoppingMallSkuOptionValueAssignment via
 *     typia.assert.
 * 11. Assert that:
 *
 *     - The id in the detail response equals the id from the create response.
 *     - ProductCode and skuCode in the detail response equal the product.code and
 *           sku.code used in creation.
 *     - ProductOptionTypeCode and productOptionValueCode in the detail response equal
 *           those used when creating the assignment.
 *     - OrderIndex (if set in the create request) is preserved in the detail
 *           response.
 */
export async function test_api_seller_sku_option_value_assignment_detail_basic_flow(
  connection: api.IConnection,
) {
  // 1. Platform admin join
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;
  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. As platform admin, create a brand
  const brandCreateBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Seller join (becomes authenticated seller in connection)
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    storeName: `Store ${RandomGenerator.name(1)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 4. Create a multi-SKU product under this seller
  const productCode: string = `PROD-${RandomGenerator.alphaNumeric(8)}`;
  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode as string & tags.MinLength<1>,
    name: `Product ${RandomGenerator.name(2)}` as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 5. Create a product option type under this product
  const optionTypeCreateBody = {
    name: "Size",
    display_name: "Size",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;
  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: product.code,
        body: optionTypeCreateBody,
      },
    );
  typia.assert(optionType);

  // 6. Create a product option value for this option type
  const optionValueCreateBody = {
    value: "L",
    display_name: "Large",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;
  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: optionType.id,
        body: optionValueCreateBody,
      },
    );
  typia.assert(optionValue);

  // 7. Create a SKU under the product
  const skuCode: string = `SKU-${RandomGenerator.alphaNumeric(8)}`;
  const skuCreateBody = {
    code: skuCode,
    name: `SKU ${RandomGenerator.name(1)}`,
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 8. Create a SKU option value assignment linking SKU and option value
  const assignmentCreateBody = {
    productOptionTypeCode: optionType.name,
    productOptionValueCode: optionValue.value,
    orderIndex: 0 as number & tags.Type<"int32">,
  } satisfies IShoppingMallSkuOptionValueAssignment.ICreate;
  const createdAssignment: IShoppingMallSkuOptionValueAssignment =
    await api.functional.shoppingMall.seller.products.skus.optionValueAssignments.create(
      connection,
      {
        productCode: product.code,
        skuCode: sku.code,
        body: assignmentCreateBody,
      },
    );
  typia.assert(createdAssignment);

  // 9. Retrieve the assignment detail as the same seller
  const fetchedAssignment: IShoppingMallSkuOptionValueAssignment =
    await api.functional.shoppingMall.seller.products.skus.optionValueAssignments.at(
      connection,
      {
        productCode: product.code,
        skuCode: sku.code,
        skuOptionValueAssignmentId: createdAssignment.id,
      },
    );
  typia.assert(fetchedAssignment);

  // 10. Validate identity consistency between create and detail responses
  TestValidator.equals(
    "assignment id should match between create and detail",
    fetchedAssignment.id,
    createdAssignment.id,
  );
  TestValidator.equals(
    "productCode should match product.code",
    fetchedAssignment.productCode,
    product.code,
  );
  TestValidator.equals(
    "skuCode should match sku.code",
    fetchedAssignment.skuCode,
    sku.code,
  );
  TestValidator.equals(
    "productOptionTypeCode should match the type code used in create body",
    fetchedAssignment.productOptionTypeCode,
    assignmentCreateBody.productOptionTypeCode,
  );
  TestValidator.equals(
    "productOptionValueCode should match the value code used in create body",
    fetchedAssignment.productOptionValueCode,
    assignmentCreateBody.productOptionValueCode,
  );
  TestValidator.equals(
    "orderIndex should be preserved in detail response",
    fetchedAssignment.orderIndex,
    assignmentCreateBody.orderIndex,
  );

  // 11. Sanity-check timestamps are non-empty ISO strings via typia.assert already,
  // but add a simple logical predicate that createdAt <= updatedAt is possible.
  TestValidator.predicate(
    "createdAt should not be empty",
    fetchedAssignment.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt should not be empty",
    fetchedAssignment.updatedAt.length > 0,
  );
}
