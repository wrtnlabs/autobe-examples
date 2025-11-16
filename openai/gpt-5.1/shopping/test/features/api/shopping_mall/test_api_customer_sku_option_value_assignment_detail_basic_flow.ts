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

export async function test_api_customer_sku_option_value_assignment_detail_basic_flow(
  connection: api.IConnection,
) {
  // 1. Platform admin joins to be able to create a brand
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create a brand as platform admin
  const brandBody = {
    name: RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 8,
    }),
    logo_uri: "https://cdn.example.com/logo/" + RandomGenerator.alphaNumeric(8),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 3. Seller joins
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 3,
      wordMax: 8,
    }),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  // 4. Seller creates a multi-SKU product associated with the brand
  const productCode = "PROD-" + RandomGenerator.alphaNumeric(12);

  const productBody = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 8 }),
    short_description: RandomGenerator.paragraph({
      sentences: 2,
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
    status: "active",
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.example.com/product/" + RandomGenerator.alphaNumeric(10),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  TestValidator.equals(
    "product code must match the requested code",
    product.code,
    productCode,
  );

  // 5. Seller creates one product option type
  const optionTypeCreateBody = {
    name: "COLOR",
    display_name: "Color",
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

  const productOptionTypeId = optionType.id;

  // 6. Seller creates one option value under that type
  const optionValueCreateBody = {
    value: "RED",
    display_name: "Red",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: product.code,
        productOptionTypeId,
        body: optionValueCreateBody,
      },
    );
  typia.assert(optionValue);

  // 7. Seller creates a SKU under the product
  const skuCode = "SKU-" + RandomGenerator.alphaNumeric(10);

  const skuCreateBody = {
    code: skuCode,
    name: RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 8 }),
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

  TestValidator.equals("sku code must match requested", sku.code, skuCode);

  // 8. Seller creates a SKU option value assignment linking the SKU and value
  const productOptionTypeCode = optionTypeCreateBody.name;
  const productOptionValueCode = optionValueCreateBody.value;

  const assignmentCreateBody = {
    productOptionTypeCode,
    productOptionValueCode,
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

  // Basic sanity checks on created assignment
  TestValidator.equals(
    "created assignment productCode matches product.code",
    createdAssignment.productCode,
    product.code,
  );
  TestValidator.equals(
    "created assignment skuCode matches sku.code",
    createdAssignment.skuCode,
    sku.code,
  );
  TestValidator.equals(
    "created assignment option type code matches request body",
    createdAssignment.productOptionTypeCode,
    productOptionTypeCode,
  );
  TestValidator.equals(
    "created assignment option value code matches request body",
    createdAssignment.productOptionValueCode,
    productOptionValueCode,
  );

  // 9. Customer joins
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://mall.example.com/join",
    referrer: "https://mall.example.com/",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  // 10. Customer retrieves the assignment via the customer GET endpoint
  const fetchedAssignment: IShoppingMallSkuOptionValueAssignment =
    await api.functional.shoppingMall.customer.products.skus.optionValueAssignments.at(
      connection,
      {
        productCode: product.code,
        skuCode: sku.code,
        skuOptionValueAssignmentId: createdAssignment.id,
      },
    );
  typia.assert(fetchedAssignment);

  // 11. Validate invariants on the fetched assignment
  TestValidator.equals(
    "fetched assignment id matches the created assignment id",
    fetchedAssignment.id,
    createdAssignment.id,
  );
  TestValidator.equals(
    "fetched assignment productCode matches product.code",
    fetchedAssignment.productCode,
    product.code,
  );
  TestValidator.equals(
    "fetched assignment skuCode matches sku.code",
    fetchedAssignment.skuCode,
    sku.code,
  );
  TestValidator.equals(
    "fetched assignment productOptionTypeCode matches request",
    fetchedAssignment.productOptionTypeCode,
    productOptionTypeCode,
  );
  TestValidator.equals(
    "fetched assignment productOptionValueCode matches request",
    fetchedAssignment.productOptionValueCode,
    productOptionValueCode,
  );

  TestValidator.predicate(
    "createdAt should be a non-empty string",
    fetchedAssignment.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt should be a non-empty string",
    fetchedAssignment.updatedAt.length > 0,
  );
}
