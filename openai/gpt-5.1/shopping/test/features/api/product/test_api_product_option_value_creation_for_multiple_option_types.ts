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
 * Validate that option values are scoped per option type and that identical
 * value keys can be reused across different option types of the same product.
 *
 * Business context: Sellers operating a multi-SKU product often define multiple
 * option types such as Color and Size. Each option type can have its own set of
 * values. The platform must allow the same internal value key (e.g., "blue") to
 * be used in different option types without cross-type uniqueness conflicts,
 * while still maintaining uniqueness within each option type.
 *
 * Steps:
 *
 * 1. Join and login as a platform admin to obtain an authorized context.
 * 2. Create a brand using the platform admin brand creation API.
 * 3. Join and login as a seller, establishing an authenticated seller session.
 * 4. Create a multi-SKU product owned by the seller and associated with the
 *    created brand.
 * 5. Under that product, create two option types:
 *
 *    - Color (display_order=1)
 *    - Size (display_order=2)
 * 6. For the Color option type, create an option value with value="blue".
 * 7. For the Size option type, also create an option value with value="blue".
 * 8. Validate that:
 *
 *    - Both option value creations succeed and return valid
 *         IShoppingMallProductOptionValue objects.
 *    - Each returned option value.optionType.id matches its respective parent option
 *         type id.
 *    - Both option values share the same value key but have different ids, proving
 *         that cross-type reuse is allowed while records remain distinct.
 */
export async function test_api_product_option_value_creation_for_multiple_option_types(
  connection: api.IConnection,
) {
  // 1. Platform admin join
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminPassword = RandomGenerator.alphaNumeric(12);
  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(),
    password: platformAdminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminJoinOutput: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminJoinOutput);

  // 2. Platform admin login (ensure token handling works and session is valid)
  const platformAdminLoginBody = {
    email: platformAdminEmail,
    password: platformAdminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoginOutput: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginOutput);

  // 3. Create a brand via platform admin API
  const brandSlug = `brand-${RandomGenerator.alphaNumeric(8)}`;
  const brandCreateBody = {
    name: RandomGenerator.name(),
    slug: brandSlug,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 4. Seller join
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    storeName: RandomGenerator.name(),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerJoinOutput: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoinOutput);

  // 5. Seller login to ensure seller-scoped APIs use a fresh authenticated context
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoginOutput: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginOutput);

  // 6. Create a multi-SKU product owned by the seller and associated with the brand
  const productCode = `PRD-${RandomGenerator.alphaNumeric(8)}`;

  const productCreateBody = {
    shopping_mall_seller_id: sellerLoginOutput.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.name(),
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
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
    "product code should match requested code",
    product.code,
    productCode,
  );
  TestValidator.predicate(
    "product is_multi_sku should be true",
    product.is_multi_sku === true,
  );

  // 7. Create two option types: Color and Size
  const colorOptionTypeBody = {
    name: "Color",
    display_name: "Color",
    display_order: 1,
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
    name: "Size",
    display_name: "Size",
    display_order: 2,
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

  TestValidator.equals(
    "first option type should be Color",
    colorOptionType.name,
    "Color",
  );
  TestValidator.equals(
    "second option type should be Size",
    sizeOptionType.name,
    "Size",
  );

  // 8. Create option values under each type, both with the same value key "blue"
  const sharedValueKey = "blue";

  const colorValueBody = {
    value: sharedValueKey,
    display_name: "Blue color",
    display_order: 1,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const colorValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: colorOptionType.id,
        body: colorValueBody,
      },
    );
  typia.assert(colorValue);

  const sizeValueBody = {
    value: sharedValueKey,
    display_name: "Blue size label",
    display_order: 1,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const sizeValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: sizeOptionType.id,
        body: sizeValueBody,
      },
    );
  typia.assert(sizeValue);

  // 9. Validate scoping and reuse semantics
  TestValidator.equals(
    "color value should use shared value key",
    colorValue.value,
    sharedValueKey,
  );
  TestValidator.equals(
    "size value should use shared value key",
    sizeValue.value,
    sharedValueKey,
  );

  TestValidator.equals(
    "color value's optionType.id should match Color option type id",
    colorValue.optionType.id,
    colorOptionType.id,
  );
  TestValidator.equals(
    "size value's optionType.id should match Size option type id",
    sizeValue.optionType.id,
    sizeOptionType.id,
  );

  TestValidator.notEquals(
    "option value records for Color and Size should have different ids",
    colorValue.id,
    sizeValue.id,
  );
}
