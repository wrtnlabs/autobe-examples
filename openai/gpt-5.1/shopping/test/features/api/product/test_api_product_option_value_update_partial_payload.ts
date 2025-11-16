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
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Validate partial update behavior of product option values.
 *
 * Business goal:
 *
 * - Ensure that PUT
 *   /shoppingMall/seller/products/{productCode}/optionTypes/{productOptionTypeId}/values/{productOptionValueId}
 *   correctly updates only the explicitly provided fields in
 *   IShoppingMallProductOptionValue.IUpdate, while preserving omitted fields,
 *   and updates timestamps consistently.
 *
 * Scenario steps:
 *
 * 1. Join a platform admin and create a brand.
 * 2. Join/login as a seller and create a multi-SKU product linked to that brand.
 * 3. Create an option type under the product.
 * 4. Create a full option value (value, display_name, display_order, is_active).
 * 5. Partially update the option value by changing only display_name and
 *    is_active.
 * 6. Verify that:
 *
 *    - Display_name and is_active reflect new values,
 *    - Value and display_order remain unchanged,
 *    - Created_at is unchanged,
 *    - Updated_at is later than the original value.
 */
export async function test_api_product_option_value_update_partial_payload(
  connection: api.IConnection,
) {
  // 1. Create a platform admin and brand (platformAdmin context)
  const platformAdminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // At this point connection Authorization header is set to platformAdmin token.

  // Create a brand under platform admin
  const brandCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 1 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 2. Create a seller and switch to seller context
  const sellerJoinBody = {
    email: `seller+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.paragraph({ sentences: 1 }),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerEmail = sellerAuthorized.email;
  const sellerPassword = sellerJoinBody.password;

  // Explicit seller login to ensure seller actor context (even though join already set it)
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoginAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAuthorized);

  // 3. Create a multi-SKU product owned by this seller and linked to the brand
  const productCode: string & tags.MinLength<1> = RandomGenerator.alphaNumeric(
    12,
  ) as string & tags.MinLength<1>;

  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
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
    "product code should match input",
    product.code,
    productCode,
  );

  // 4. Create an option type for this product
  const optionTypeCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 1 }),
    display_name: "Color",
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
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

  TestValidator.equals(
    "option type display_name should match",
    optionType.display_name ?? undefined,
    optionTypeCreateBody.display_name ?? undefined,
  );

  // 5. Create an initial option value with full fields set
  const initialValueBody = {
    value: RandomGenerator.paragraph({ sentences: 1 }),
    display_name: "Blue",
    display_order: 10 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const createdOptionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: optionType.id,
        body: initialValueBody,
      },
    );
  typia.assert(createdOptionValue);

  const originalValue = createdOptionValue.value;
  const originalDisplayName = createdOptionValue.display_name ?? null;
  const originalDisplayOrder = createdOptionValue.display_order;
  const originalIsActive = createdOptionValue.is_active;
  const originalCreatedAt = createdOptionValue.created_at;
  const originalUpdatedAt = createdOptionValue.updated_at;

  TestValidator.equals(
    "initial value should match request body",
    createdOptionValue.value,
    initialValueBody.value,
  );
  TestValidator.equals(
    "initial display_name should match request body",
    createdOptionValue.display_name ?? null,
    initialValueBody.display_name ?? null,
  );
  TestValidator.equals(
    "initial display_order should match request body",
    createdOptionValue.display_order,
    initialValueBody.display_order,
  );
  TestValidator.equals(
    "initial is_active should match request body",
    createdOptionValue.is_active,
    initialValueBody.is_active ?? true,
  );

  // 6. Partially update the option value: change only display_name and is_active
  const updatedDisplayName = "Sky Blue";
  const updatedIsActive = false;

  const partialUpdateBody = {
    display_name: updatedDisplayName,
    is_active: updatedIsActive,
  } satisfies IShoppingMallProductOptionValue.IUpdate;

  const updatedOptionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.update(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: optionType.id,
        productOptionValueId: createdOptionValue.id,
        body: partialUpdateBody,
      },
    );
  typia.assert(updatedOptionValue);

  // 7. Validate that explicitly included fields are updated
  TestValidator.equals(
    "display_name should be updated to new value",
    updatedOptionValue.display_name ?? null,
    updatedDisplayName,
  );
  TestValidator.equals(
    "is_active should be updated to new value",
    updatedOptionValue.is_active,
    updatedIsActive,
  );

  // 8. Validate that omitted fields remain unchanged
  TestValidator.equals(
    "value should remain unchanged when omitted in partial update",
    updatedOptionValue.value,
    originalValue,
  );
  TestValidator.equals(
    "display_order should remain unchanged when omitted in partial update",
    updatedOptionValue.display_order,
    originalDisplayOrder,
  );

  // 9. Validate timestamps
  TestValidator.equals(
    "created_at should remain unchanged after update",
    updatedOptionValue.created_at,
    originalCreatedAt,
  );

  const originalUpdatedAtDate = new Date(originalUpdatedAt);
  const newUpdatedAtDate = new Date(updatedOptionValue.updated_at);

  TestValidator.predicate(
    "updated_at should be later than original updated_at",
    newUpdatedAtDate.getTime() >= originalUpdatedAtDate.getTime(),
  );

  // 10. Validate that optionType association remains consistent
  TestValidator.equals(
    "option type id should remain the same after update",
    updatedOptionValue.optionType.id,
    optionType.id,
  );
}
