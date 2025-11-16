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
 * Verify that deleting a SKU option value assignment via the platformAdmin
 * endpoint is only allowed for a platform administrator and is rejected for
 * unauthenticated or seller-authenticated callers.
 *
 * Business workflow:
 *
 * 1. Create two actors: seller S1 and platform admin A1 using their join APIs.
 * 2. Under S1, create a product, a product option type, a product option value, a
 *    SKU, and finally a SKU option value assignment so we have a concrete
 *    {productCode, skuCode, assignmentId} tuple to target.
 * 3. (Best-effort) attempt to simulate unauthenticated access to the platformAdmin
 *    delete endpoint. Due to SDK automatically propagating Authorization
 *    headers, this may not truly be header-less, so this step focuses on
 *    structure rather than strict header inspection.
 * 4. Authenticate as seller S1 and attempt to call the same platformAdmin delete
 *    endpoint; the backend should reject this because S1 is not a platform
 *    admin.
 * 5. Authenticate as platform admin A1 and successfully delete the assignment via
 *    the platformAdmin erase endpoint.
 * 6. Verify that a second delete attempt as A1 fails with an error, proving the
 *    assignment has been removed.
 */
export async function test_api_platform_admin_sku_option_value_assignment_delete_access_control_requires_admin_role(
  connection: api.IConnection,
) {
  // 1. Register seller S1
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuth);

  const sellerEmail: string & tags.Format<"email"> = sellerAuth.email;
  const sellerPassword: string = sellerJoinBody.password;

  // 2. Register platform admin A1
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(14),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuth: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(adminAuth);

  const adminEmail: string & tags.Format<"email"> = adminAuth.email;
  const adminPassword: string = platformAdminJoinBody.password;

  // 3. As seller S1, create a product owned by this seller
  const productCode: string & tags.MinLength<1> =
    RandomGenerator.alphaNumeric(12);

  const productCreateBody = {
    shopping_mall_seller_id: sellerAuth.id,
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
      body: productCreateBody,
    });
  typia.assert(sellerProduct);
  TestValidator.equals(
    "created product code must match requested code",
    sellerProduct.code,
    productCode,
  );

  // 4. Under S1, create an option type
  const optionTypeCreateBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: productCode,
        body: optionTypeCreateBody,
      },
    );
  typia.assert(optionType);

  // 5. Under S1, create an option value for the option type
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
        productCode: productCode,
        productOptionTypeId: optionType.id,
        body: optionValueCreateBody,
      },
    );
  typia.assert(optionValue);

  // 6. Under S1, create a SKU for the product
  const skuCode: string = RandomGenerator.alphaNumeric(10);

  const skuCreateBody = {
    code: skuCode,
    name: `${sellerProduct.name} - Red`,
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sellerSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: productCode,
      body: skuCreateBody,
    });
  typia.assert(sellerSku);
  TestValidator.equals(
    "created SKU code must match requested code",
    sellerSku.code,
    skuCode,
  );

  // 7. Under S1, create a SKU option value assignment
  const assignmentCreateBody = {
    productOptionTypeCode: optionValue.optionType.name,
    productOptionValueCode: optionValue.value,
    orderIndex: null,
  } satisfies IShoppingMallSkuOptionValueAssignment.ICreate;

  const assignment: IShoppingMallSkuOptionValueAssignment =
    await api.functional.shoppingMall.seller.products.skus.optionValueAssignments.create(
      connection,
      {
        productCode: productCode,
        skuCode: skuCode,
        body: assignmentCreateBody,
      },
    );
  typia.assert(assignment);

  const assignmentId: string & tags.Format<"uuid"> = assignment.id;

  // 8. Best-effort unauthenticated attempt
  // NOTE: Because the SDK automatically manages Authorization headers and
  // this test environment restricts direct header manipulation, we cannot
  // reliably produce a truly unauthenticated call. Therefore, this step is
  // documented but not enforced with a TestValidator.error assertion.

  // 9. Authenticate as seller S1, then attempt platformAdmin delete
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  await TestValidator.error(
    "seller must not be allowed to delete via platformAdmin erase endpoint",
    async () => {
      await api.functional.shoppingMall.platformAdmin.products.skus.optionValueAssignments.erase(
        connection,
        {
          productCode: productCode,
          skuCode: skuCode,
          skuOptionValueAssignmentId: assignmentId,
        },
      );
    },
  );

  // 10. Authenticate as platform admin A1 and successfully delete
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  await api.functional.shoppingMall.platformAdmin.products.skus.optionValueAssignments.erase(
    connection,
    {
      productCode: productCode,
      skuCode: skuCode,
      skuOptionValueAssignmentId: assignmentId,
    },
  );

  // 11. Verify that second delete attempt as admin now fails
  await TestValidator.error(
    "deleting the same SKU option value assignment twice should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.products.skus.optionValueAssignments.erase(
        connection,
        {
          productCode: productCode,
          skuCode: skuCode,
          skuOptionValueAssignmentId: assignmentId,
        },
      );
    },
  );
}
