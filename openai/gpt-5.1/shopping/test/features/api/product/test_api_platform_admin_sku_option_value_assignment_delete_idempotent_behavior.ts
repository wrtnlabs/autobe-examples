import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
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
 * Validate idempotent deletion semantics for platform-admin SKU option value
 * assignments.
 *
 * Business context:
 *
 * - A seller defines option types and option values on a product, then creates a
 *   SKU and attaches an option value assignment to that SKU.
 * - A platform administrator, operating through the platformAdmin namespace, can
 *   delete that specific SKU option value assignment.
 * - Deleting the same assignment twice should behave idempotently: the first
 *   deletion succeeds (void result), the second deletion yields a not-found
 *   style error without affecting other catalog state.
 *
 * Test steps:
 *
 * 1. Create and authenticate a seller actor.
 * 2. As seller, create a product via seller API with is_multi_sku=true.
 * 3. Create a product option type under that product.
 * 4. Create a product option value under that option type.
 * 5. Create a seller-visible SKU for that product with a concrete skuCode.
 * 6. Create a SKU option value assignment (seller endpoint) tying the SKU to the
 *    option value.
 * 7. Create and authenticate a platform admin actor.
 * 8. Optionally create a brand and category tree for realism.
 * 9. As platformAdmin, create a product and SKU that share the same
 *    productCode/skuCode as the seller-side entities so that the delete path is
 *    valid.
 * 10. Perform the first DELETE via platformAdmin endpoint and assert it succeeds.
 * 11. Perform the second DELETE with the same identifiers and assert that an error
 *     occurs, without checking specific HTTP status codes.
 */
export async function test_api_platform_admin_sku_option_value_assignment_delete_idempotent_behavior(
  connection: api.IConnection,
) {
  // 1. Seller joins (and becomes authenticated)
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  // 2. Seller creates a product configured as multi-SKU
  const productCode = RandomGenerator.alphaNumeric(12);

  const sellerProductBody = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_brand_id: undefined,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: undefined,
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const sellerProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: sellerProductBody,
    });
  typia.assert(sellerProduct);

  TestValidator.equals(
    "seller product code matches requested code",
    sellerProduct.code,
    productCode,
  );

  // 3. Seller creates an option type for this product
  const optionTypeBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: sellerProduct.code,
        body: optionTypeBody,
      },
    );
  typia.assert(optionType);

  // 4. Seller creates an option value under this type
  const optionValueBody = {
    value: "RED",
    display_name: "Red",
    display_order: 0,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: sellerProduct.code,
        productOptionTypeId: optionType.id,
        body: optionValueBody,
      },
    );
  typia.assert(optionValue);

  // 5. Seller creates a SKU
  const skuCode = RandomGenerator.alphaNumeric(10);

  const sellerSkuBody = {
    code: skuCode,
    name: "Variant Red",
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sellerSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: sellerProduct.code,
      body: sellerSkuBody,
    });
  typia.assert(sellerSku);

  TestValidator.equals(
    "seller SKU code matches requested code",
    sellerSku.code,
    skuCode,
  );

  // 6. Seller creates a SKU option value assignment tying SKU to option value
  // We don't see explicit business codes on option type/value structures,
  // so we use the option type name and option value value as business-visible codes.
  const assignmentBody = {
    productOptionTypeCode: optionType.name,
    productOptionValueCode: optionValue.value,
    orderIndex: 0,
  } satisfies IShoppingMallSkuOptionValueAssignment.ICreate;

  const assignment: IShoppingMallSkuOptionValueAssignment =
    await api.functional.shoppingMall.seller.products.skus.optionValueAssignments.create(
      connection,
      {
        productCode: sellerProduct.code,
        skuCode: sellerSku.code,
        body: assignmentBody,
      },
    );
  typia.assert(assignment);

  // 7. Platform admin joins and becomes authenticated
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(platformAdmin);

  // 8. Create auxiliary brand and category tree for realism (not required for delete behavior)
  const brandBody = {
    name: RandomGenerator.paragraph({ sentences: 1 }),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: undefined,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  const categoryTreeBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 1 }),
    description: undefined,
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: categoryTreeBody,
      },
    );
  typia.assert(categoryTree);

  // 9. Platform admin creates its own view of the product using same seller and brand
  const adminProductBody = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: sellerProduct.name,
    short_description: sellerProduct.short_description ?? undefined,
    description: sellerProduct.description ?? undefined,
    status: sellerProduct.status,
    is_multi_sku: sellerProduct.is_multi_sku,
    primary_image_uri: sellerProduct.primary_image_uri ?? undefined,
    additional_data: sellerProduct.additional_data ?? undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const adminProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: adminProductBody,
      },
    );
  typia.assert(adminProduct);

  // 10. Platform admin creates a SKU under its namespace with the same skuCode
  const adminSkuBody = {
    code: skuCode,
    name: sellerSku.name,
    listPrice: sellerSku.listPrice,
    salePrice: sellerSku.salePrice,
    currency: sellerSku.currency,
    isActive: sellerSku.isActive,
    isPurchasable: sellerSku.isPurchasable,
  } satisfies IShoppingMallProductSku.ICreate;

  const adminSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: adminProduct.code,
        body: adminSkuBody,
      },
    );
  typia.assert(adminSku);

  TestValidator.equals(
    "admin SKU code equals seller SKU code",
    adminSku.code,
    sellerSku.code,
  );

  // 11. First deletion as platform admin: should succeed without error
  await api.functional.shoppingMall.platformAdmin.products.skus.optionValueAssignments.erase(
    connection,
    {
      productCode: adminProduct.code,
      skuCode: adminSku.code,
      skuOptionValueAssignmentId: assignment.id,
    },
  );

  // 12. Second deletion: expect a business-level error (e.g., not-found) without
  // asserting specific HTTP status codes.
  await TestValidator.error(
    "second deletion of SKU option value assignment should fail idempotently",
    async () => {
      await api.functional.shoppingMall.platformAdmin.products.skus.optionValueAssignments.erase(
        connection,
        {
          productCode: adminProduct.code,
          skuCode: adminSku.code,
          skuOptionValueAssignmentId: assignment.id,
        },
      );
    },
  );
}
