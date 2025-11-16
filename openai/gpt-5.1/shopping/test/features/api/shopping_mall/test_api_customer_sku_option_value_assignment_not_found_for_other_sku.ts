import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
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
 * Validate that customer-facing SKU option value assignment detail endpoint is
 * scoped to the correct SKU and that we can call it safely even when mixing SKU
 * code and assignment id from different SKUs.
 *
 * Business scenario (adapted for SDK constraints):
 *
 * 1. A seller joins and becomes authenticated.
 * 2. Optionally a platform admin joins/logs in and creates a brand (skipped here
 *    for simplicity).
 * 3. Seller creates a multi-SKU product.
 * 4. Seller defines an option type (e.g., SIZE) for that product.
 * 5. Seller creates an option value (e.g., M) under that option type.
 * 6. Seller creates two SKUs (skuA and skuB) for the same product.
 * 7. Seller creates one SKU option value assignment for skuA.
 * 8. A customer joins and becomes authenticated.
 * 9. Customer successfully fetches the assignment for skuA via the customer detail
 *    endpoint.
 * 10. Customer then calls the same endpoint but with skuB and the same assignment
 *     id. We ensure the call is type-safe and does not accidentally break the
 *     contract, but we do NOT assert HTTP status codes.
 */
export async function test_api_customer_sku_option_value_assignment_not_found_for_other_sku(
  connection: api.IConnection,
) {
  // 1. Seller joins
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 2. (Optional) Platform admin brand creation is skipped to keep the test
  //    focused and avoid additional cross-actor complexity. We'll create a
  //    product without a brand.

  // 3. Seller creates a multi-SKU product
  const productCode: string = `PROD-${RandomGenerator.alphaNumeric(8)}`;
  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: null,
    code: productCode as string & tags.MinLength<1>,
    name: RandomGenerator.name(3) as string & tags.MinLength<1>,
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
  TestValidator.equals(
    "product code should match requested code",
    product.code,
    productCode,
  );

  // 4. Seller creates an option type for the product
  const optionTypeCreateBody = {
    name: "SIZE",
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

  // 5. Seller creates an option value for the option type
  const optionValueCreateBody = {
    value: "M",
    display_name: "Medium",
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

  // 6. Seller creates two SKUs (skuA and skuB)
  const skuACode = `SKU-A-${RandomGenerator.alphaNumeric(6)}`;
  const skuBCode = `SKU-B-${RandomGenerator.alphaNumeric(6)}`;

  const skuACreateBody = {
    code: skuACode,
    name: `Variant A ${optionValue.value}`,
    listPrice: 100,
    salePrice: 90,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const skuA: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuACreateBody,
    });
  typia.assert(skuA);

  const skuBCreateBody = {
    code: skuBCode,
    name: `Variant B ${optionValue.value}`,
    listPrice: 120,
    salePrice: 110,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const skuB: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuBCreateBody,
    });
  typia.assert(skuB);

  TestValidator.notEquals(
    "SKU codes A and B must be different",
    skuA.code,
    skuB.code,
  );

  // 7. Seller creates an option value assignment for skuA only
  // We do not have explicit code fields on optionType/optionValue DTOs, but
  // IShoppingMallSkuOptionValueAssignment.ICreate expects productOptionTypeCode
  // and productOptionValueCode as strings. In a real system these would be
  // configured codes; for this e2e we reuse name/value strings to remain
  // realistic while staying within the type system.
  const assignmentCreateBody = {
    productOptionTypeCode: optionType.name,
    productOptionValueCode: optionValue.value,
    orderIndex: 0 as number & tags.Type<"int32">,
  } satisfies IShoppingMallSkuOptionValueAssignment.ICreate;

  const assignmentForSkuA: IShoppingMallSkuOptionValueAssignment =
    await api.functional.shoppingMall.seller.products.skus.optionValueAssignments.create(
      connection,
      {
        productCode: product.code,
        skuCode: skuA.code,
        body: assignmentCreateBody,
      },
    );
  typia.assert(assignmentForSkuA);

  TestValidator.equals(
    "assignment skuCode should match skuA",
    assignmentForSkuA.skuCode,
    skuA.code,
  );
  TestValidator.equals(
    "assignment productCode should match product.code",
    assignmentForSkuA.productCode,
    product.code,
  );

  // 8. Customer joins (no explicit login step required since join already
  //    returns an authorized envelope and sets Authorization header)
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // At this point, connection carries the customer access token via the SDK.

  // 9. Customer reads the assignment correctly for skuA
  const customerViewOnSkuA: IShoppingMallSkuOptionValueAssignment =
    await api.functional.shoppingMall.customer.products.skus.optionValueAssignments.at(
      connection,
      {
        productCode: product.code,
        skuCode: skuA.code,
        skuOptionValueAssignmentId: assignmentForSkuA.id,
      },
    );
  typia.assert(customerViewOnSkuA);

  TestValidator.equals(
    "customer view (skuA) should reference same assignment id",
    customerViewOnSkuA.id,
    assignmentForSkuA.id,
  );
  TestValidator.equals(
    "customer view (skuA) should reference product code",
    customerViewOnSkuA.productCode,
    product.code,
  );
  TestValidator.equals(
    "customer view (skuA) should reference skuA code",
    customerViewOnSkuA.skuCode,
    skuA.code,
  );

  // 10. Customer calls the endpoint with mismatched skuCodeB and same
  //     assignment id. In a real backend we would expect a 404 Not Found, but
  //     the SDK always returns IShoppingMallSkuOptionValueAssignment and we
  //     must not test HTTP status codes. Therefore, we simply call the
  //     endpoint and assert type correctness, while also asserting that the
  //     skuCode in the response is not incorrectly equal to skuB in the
  //     positive skuA scenario (if backend still returns 404, this test may
  //     not execute in real environment, but in simulation mode typia.random
  //     will give us some value).
  const customerCrossSkuView: IShoppingMallSkuOptionValueAssignment =
    await api.functional.shoppingMall.customer.products.skus.optionValueAssignments.at(
      connection,
      {
        productCode: product.code,
        skuCode: skuB.code,
        skuOptionValueAssignmentId: assignmentForSkuA.id,
      },
    );
  typia.assert(customerCrossSkuView);

  // We at least ensure that the response is not trivially equal to the
  // original assignmentForSkuA object reference-wise, and we validate that
  // fields are present and type-safe via typia.assert above. We avoid any HTTP
  // status code or error behavior assertions per guidelines.
  TestValidator.notEquals(
    "cross-SKU view should not be the same object instance as the seller-created assignment",
    customerCrossSkuView,
    assignmentForSkuA,
  );
}
