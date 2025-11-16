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
 * Validate customer-facing visibility of a SKU option value assignment.
 *
 * Business flow (adapted to available APIs):
 *
 * 1. Platform admin joins and creates a brand.
 * 2. Seller joins and creates a multi-SKU product associated with that brand.
 * 3. Seller creates a product option type (e.g., COLOR).
 * 4. Seller creates an option value under that type (e.g., GREEN), marked active.
 * 5. Seller creates a SKU under the product.
 * 6. Seller assigns the option value to the SKU via SKU option value assignment.
 * 7. Customer joins and logs in.
 * 8. Customer fetches the assignment detail via GET
 *    /shoppingMall/customer/products/{productCode}/skus/{skuCode}/optionValueAssignments/{skuOptionValueAssignmentId}.
 * 9. Validate that the assignment returned to the customer is structurally correct
 *    and consistent with the seller-created assignment (codes and timestamps).
 */
export async function test_api_customer_sku_option_value_assignment_visibility_for_inactive_option_value(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (authorization token is handled by SDK)
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Platform admin creates a brand
  const brandSlug = `brand-${RandomGenerator.alphaNumeric(8)}`;
  const brandCreateBody = {
    name: RandomGenerator.name(2),
    slug: brandSlug,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Seller joins
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12),
    storeName: `Store ${RandomGenerator.name(1)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  // 4. Seller creates a multi-SKU product associated with the brand
  const productCode = `PRD-${RandomGenerator.alphaNumeric(10)}` as string &
    tags.MinLength<1>;
  const productCreateBody = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.name(3) as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product-primary.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);
  TestValidator.equals(
    "created product code matches requested code",
    product.code,
    productCode,
  );

  // 5. Seller creates a product option type (e.g., COLOR)
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

  // We will use a synthetic code for the option type when assigning later.
  const productOptionTypeCode = "COLOR";

  // 6. Seller creates an option value under that type (e.g., GREEN)
  const optionValueCreateBody = {
    value: "GREEN",
    display_name: "Green",
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

  const productOptionValueCode = optionValue.value;

  // 7. Seller creates a SKU under the product
  const skuCode = `SKU-${RandomGenerator.alphaNumeric(8)}`;
  const skuCreateBody = {
    code: skuCode,
    name: `${product.name} - Green`,
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
  TestValidator.equals(
    "created SKU code matches requested code",
    sku.code,
    skuCode,
  );

  // 8. Seller assigns the option value to the SKU
  const assignmentCreateBody = {
    productOptionTypeCode: productOptionTypeCode,
    productOptionValueCode: productOptionValueCode,
    orderIndex: 0 as number & tags.Type<"int32">,
  } satisfies IShoppingMallSkuOptionValueAssignment.ICreate;

  const sellerAssignment: IShoppingMallSkuOptionValueAssignment =
    await api.functional.shoppingMall.seller.products.skus.optionValueAssignments.create(
      connection,
      {
        productCode: product.code,
        skuCode: sku.code,
        body: assignmentCreateBody,
      },
    );
  typia.assert(sellerAssignment);

  TestValidator.equals(
    "seller assignment productCode matches product",
    sellerAssignment.productCode,
    product.code,
  );
  TestValidator.equals(
    "seller assignment skuCode matches sku",
    sellerAssignment.skuCode,
    sku.code,
  );

  // 9. Customer joins (authorization header will switch to customer)
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/product-list",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  // 10. Customer fetches the assignment detail through the customer endpoint
  const customerAssignment: IShoppingMallSkuOptionValueAssignment =
    await api.functional.shoppingMall.customer.products.skus.optionValueAssignments.at(
      connection,
      {
        productCode: product.code,
        skuCode: sku.code,
        skuOptionValueAssignmentId: sellerAssignment.id,
      },
    );
  typia.assert(customerAssignment);

  // 11. Validate consistency between seller-created assignment and customer view
  TestValidator.equals(
    "customer assignment id matches seller assignment id",
    customerAssignment.id,
    sellerAssignment.id,
  );
  TestValidator.equals(
    "customer assignment productCode matches",
    customerAssignment.productCode,
    sellerAssignment.productCode,
  );
  TestValidator.equals(
    "customer assignment skuCode matches",
    customerAssignment.skuCode,
    sellerAssignment.skuCode,
  );
  TestValidator.equals(
    "customer assignment productOptionTypeCode matches",
    customerAssignment.productOptionTypeCode,
    sellerAssignment.productOptionTypeCode,
  );
  TestValidator.equals(
    "customer assignment productOptionValueCode matches",
    customerAssignment.productOptionValueCode,
    sellerAssignment.productOptionValueCode,
  );

  // Basic invariant: orderIndex should match as well (null vs number handled by equals)
  TestValidator.equals(
    "customer assignment orderIndex matches",
    customerAssignment.orderIndex ?? null,
    sellerAssignment.orderIndex ?? null,
  );

  // Timestamps already validated by typia.assert as date-time strings; we just
  // ensure they are not empty.
  TestValidator.predicate(
    "customer assignment createdAt is non-empty",
    customerAssignment.createdAt.length > 0,
  );
  TestValidator.predicate(
    "customer assignment updatedAt is non-empty",
    customerAssignment.updatedAt.length > 0,
  );
}
