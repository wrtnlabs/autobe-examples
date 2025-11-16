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
 * Validate uniqueness enforcement when updating product option values.
 *
 * This E2E test verifies that the seller-facing endpoint PUT
 * /shoppingMall/seller/products/{productCode}/optionTypes/{productOptionTypeId}/values/{productOptionValueId}
 * enforces uniqueness constraints on `value` and `display_order` within a
 * single option type, and rejects updates that would collide with existing
 * option values.
 *
 * Business scenario:
 *
 * - A seller manages a multi-SKU product with option types (e.g., Color) and
 *   option values (e.g., blue, red) that are used to build SKUs.
 * - Within a given option type, the backend requires that the `value` string (the
 *   canonical key) and the `display_order` integer be unique across all option
 *   values for that type.
 * - When the seller attempts to update one option value to use a `value` or
 *   `display_order` that is already taken by another sibling option value, the
 *   update must fail and the original database state must remain intact.
 *
 * Test flow:
 *
 * 1. Create authentication actors and catalog context:
 *
 *    - Register a seller account using /auth/seller/join. This call also establishes
 *         an authenticated session for seller-scoped APIs.
 *    - Register a platform admin via /auth/platformAdmin/join and stay authenticated
 *         as platformAdmin.
 *    - As platformAdmin, create a brand using POST
 *         /shoppingMall/platformAdmin/brands with IShoppingMallBrand.ICreate.
 *    - Switch back to seller by logging in via /auth/seller/login so that subsequent
 *         product and option operations run under seller context.
 * 2. Create a multi-SKU product:
 *
 *    - Call POST /shoppingMall/seller/products with IShoppingMallProduct.ICreate to
 *         create a product that:
 *
 *         - Is owned by the seller (shopping_mall_seller_id = seller.id),
 *         - Is associated with the created brand via shopping_mall_brand_id,
 *         - Has a unique non-empty `code`,
 *         - Has status set to "active",
 *         - Has is_multi_sku = true.
 *    - Assert the response type with typia.assert and keep the product.code and
 *         seller.id for subsequent calls.
 * 3. Create a product option type:
 *
 *    - As seller, call POST /shoppingMall/seller/products/{productCode}/optionTypes
 *         with IShoppingMallProductOptionType.ICreate to create a single option
 *         type, e.g. name="Color", display_name="Color", display_order=0.
 *    - Assert the response and store the optionType.id.
 * 4. Create two distinct option values under this option type:
 *
 *    - Call POST
 *         /shoppingMall/seller/products/{productCode}/optionTypes/{productOptionTypeId}/values
 *         twice using IShoppingMallProductOptionValue.ICreate to create:
 *
 *         - ValueA: value="blue", display_name="Blue", display_order=1, is_active=true
 *         - ValueB: value="red", display_name="Red", display_order=2, is_active=true
 *    - Assert both responses with typia.assert.
 *    - Use TestValidator.equals to confirm that:
 *
 *         - ValueA.id !== valueB.id (different records)
 *         - ValueA.value !== valueB.value
 *         - ValueA.display_order !== valueB.display_order
 * 5. Attempt invalid update A: collide on `value` key:
 *
 *    - Use PUT /shoppingMall/seller/products/{productCode}/optionTypes/{productOptionTypeId}/values/{productOptionValueId}
 *         targeting valueB.id, with body that attempts to set { value:
 *         valueA.value } (leaving display_order unchanged).
 *    - Wrap this call in await TestValidator.error with an async closure.
 *    - Expect the call to throw due to uniqueness violation, but do not assert the
 *         specific HTTP status code.
 * 6. Attempt invalid update B: collide on `display_order`:
 *
 *    - Again call the same PUT endpoint for valueB.id, but this time with body {
 *         display_order: valueA.display_order } while keeping valueB.value
 *         unchanged.
 *    - Again use await TestValidator.error to assert that the update fails due to
 *         display_order uniqueness.
 * 7. Sanity check with a valid update:
 *
 *    - Perform a valid update on valueB that does not touch `value` or
 *         `display_order`, for example updating only the `display_name` to a
 *         new random paragraph or toggling `is_active`.
 *    - Assert the updated response with typia.assert.
 *    - Use TestValidator.equals to confirm:
 *
 *         - Updated.id === valueB.id
 *         - Updated.value === valueB.value
 *         - Updated.display_order === valueB.display_order
 *
 * Notes and constraints:
 *
 * - All DTOs must be populated with correct types and formats using typia and
 *   RandomGenerator. We must not send wrong types or omit required fields to
 *   simulate errors; invalid cases come only from business uniqueness rules.
 * - We do not validate specific HTTP statuses or error payloads, only that errors
 *   occur for the invalid update attempts.
 * - We rely solely on the provided SDK functions and DTOs, without adding extra
 *   imports or touching connection.headers directly.
 */
export async function test_api_product_option_value_update_uniqueness_violation(
  connection: api.IConnection,
) {
  // 1. Seller joins and becomes authenticated
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
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  const sellerEmail: string = sellerAuthorized.email;
  const sellerPassword: string = sellerJoinBody.password;

  // 2. Platform admin joins and creates a brand
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(platformAdminAuthorized);

  const brandCreateBody = {
    name: RandomGenerator.name(1),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri: "https://cdn.example.com/logo.png" as string & tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert<IShoppingMallBrand>(brand);

  // 3. Switch back to seller by logging in
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerReAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerReAuth);

  // 4. Create a multi-SKU product owned by the seller and associated with the brand
  const productCode: string & tags.MinLength<1> = RandomGenerator.alphaNumeric(
    16,
  ) as string & tags.MinLength<1>;

  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png" as string &
      tags.Format<"uri">,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 5. Create an option type for this product
  const optionTypeCreateBody = {
    name: "Color",
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
  typia.assert<IShoppingMallProductOptionType>(optionType);

  // 6. Create two distinct option values: valueA and valueB
  const valueACreateBody = {
    value: "blue",
    display_name: "Blue",
    display_order: 1 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const valueA: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: optionType.id,
        body: valueACreateBody,
      },
    );
  typia.assert<IShoppingMallProductOptionValue>(valueA);

  const valueBCreateBody = {
    value: "red",
    display_name: "Red",
    display_order: 2 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const valueB: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: optionType.id,
        body: valueBCreateBody,
      },
    );
  typia.assert<IShoppingMallProductOptionValue>(valueB);

  // Basic distinctness checks between valueA and valueB
  TestValidator.notEquals(
    "option value ids should differ",
    valueA.id,
    valueB.id,
  );
  TestValidator.notEquals(
    "option value keys should differ",
    valueA.value,
    valueB.value,
  );
  TestValidator.notEquals(
    "option value display_order should differ",
    valueA.display_order,
    valueB.display_order,
  );

  // 7. Invalid update A: collide on `value` key
  await TestValidator.error(
    "updating value key to collide should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.optionTypes.values.update(
        connection,
        {
          productCode: product.code,
          productOptionTypeId: optionType.id,
          productOptionValueId: valueB.id,
          body: {
            value: valueA.value,
          } satisfies IShoppingMallProductOptionValue.IUpdate,
        },
      );
    },
  );

  // 8. Invalid update B: collide on `display_order`
  await TestValidator.error(
    "updating display_order to collide should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.optionTypes.values.update(
        connection,
        {
          productCode: product.code,
          productOptionTypeId: optionType.id,
          productOptionValueId: valueB.id,
          body: {
            display_order: valueA.display_order,
          } satisfies IShoppingMallProductOptionValue.IUpdate,
        },
      );
    },
  );

  // 9. Sanity check: valid update that does not touch unique fields
  const newDisplayName: string = RandomGenerator.paragraph({ sentences: 2 });

  const updatedValueB: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.update(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: optionType.id,
        productOptionValueId: valueB.id,
        body: {
          display_name: newDisplayName,
        } satisfies IShoppingMallProductOptionValue.IUpdate,
      },
    );
  typia.assert<IShoppingMallProductOptionValue>(updatedValueB);

  TestValidator.equals(
    "updated valueB should keep same id",
    updatedValueB.id,
    valueB.id,
  );
  TestValidator.equals(
    "updated valueB should keep same value key",
    updatedValueB.value,
    valueB.value,
  );
  TestValidator.equals(
    "updated valueB should keep same display_order",
    updatedValueB.display_order,
    valueB.display_order,
  );
}
