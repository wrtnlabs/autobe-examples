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

export async function test_api_product_option_value_update_basic_fields(
  connection: api.IConnection,
) {
  // 1. Seller join (creates authenticated seller session)
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

  // 2. Platform admin join & login to create brand
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(14),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminJoined: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(platformAdminJoined);

  const platformAdminLoginBody = {
    email: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(platformAdminLoggedIn);

  // 3. Create brand as platform admin
  const brandCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 10,
    }),
    logo_uri:
      "https://cdn.example.com/logo/" +
      RandomGenerator.alphaNumeric(8) +
      ".png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert<IShoppingMallBrand>(brand);

  // 4. Switch back to seller context via login to ensure fresh session
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLoggedIn);

  // 5. Create product as seller using the brand
  const productCode: string & tags.MinLength<1> = ("PRD-" +
    RandomGenerator.alphaNumeric(8)) as string & tags.MinLength<1>;

  const productCreateBody = {
    shopping_mall_seller_id: sellerLoggedIn.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    short_description: RandomGenerator.paragraph({
      sentences: 3,
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
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.example.com/product/" + productCode + "/main.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  TestValidator.equals(
    "product code from response should match requested code",
    product.code,
    productCreateBody.code,
  );

  // 6. Create option type under the product
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

  TestValidator.equals(
    "option type name should match",
    optionType.name,
    optionTypeCreateBody.name,
  );

  // 7. Create initial option value
  const initialOptionValueCreateBody = {
    value: "blue",
    display_name: "Blue",
    display_order: 1 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const initialOptionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: optionType.id,
        body: initialOptionValueCreateBody,
      },
    );
  typia.assert<IShoppingMallProductOptionValue>(initialOptionValue);

  TestValidator.equals(
    "created option value should have initial value",
    initialOptionValue.value,
    initialOptionValueCreateBody.value,
  );
  TestValidator.equals(
    "created option value should be active",
    initialOptionValue.is_active,
    true,
  );
  TestValidator.equals(
    "created option value belongs to correct option type",
    initialOptionValue.optionType.id,
    optionType.id,
  );

  const createdId = initialOptionValue.id;
  const createdOptionTypeId = initialOptionValue.optionType.id;
  const createdCreatedAt = new Date(initialOptionValue.created_at).getTime();
  const createdUpdatedAt = new Date(initialOptionValue.updated_at).getTime();

  TestValidator.predicate(
    "created_at and updated_at on create should be valid timestamps",
    !Number.isNaN(createdCreatedAt) && !Number.isNaN(createdUpdatedAt),
  );

  // 8. Update option value basic fields
  const updateBody = {
    value: "navy-blue",
    display_name: "Navy Blue",
    display_order: 3 as number & tags.Type<"int32">,
    is_active: false,
  } satisfies IShoppingMallProductOptionValue.IUpdate;

  const updatedOptionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.update(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: createdOptionTypeId,
        productOptionValueId: createdId,
        body: updateBody,
      },
    );
  typia.assert<IShoppingMallProductOptionValue>(updatedOptionValue);

  // 9. Validate identifiers and immutable fields
  TestValidator.equals(
    "option value id should remain unchanged after update",
    updatedOptionValue.id,
    createdId,
  );
  TestValidator.equals(
    "option type id should remain unchanged after update",
    updatedOptionValue.optionType.id,
    createdOptionTypeId,
  );

  TestValidator.equals(
    "created_at should remain the same after update",
    updatedOptionValue.created_at,
    initialOptionValue.created_at,
  );

  // 10. Validate updated fields
  TestValidator.equals(
    "value field should be updated",
    updatedOptionValue.value,
    updateBody.value,
  );
  TestValidator.equals(
    "display_name field should be updated",
    updatedOptionValue.display_name,
    updateBody.display_name,
  );
  TestValidator.equals(
    "display_order field should be updated",
    updatedOptionValue.display_order,
    updateBody.display_order,
  );
  TestValidator.equals(
    "is_active flag should be updated to false",
    updatedOptionValue.is_active,
    updateBody.is_active,
  );

  // 11. Validate updated_at is later than created_at
  const updatedCreatedAt = new Date(updatedOptionValue.created_at).getTime();
  const updatedUpdatedAt = new Date(updatedOptionValue.updated_at).getTime();

  TestValidator.predicate(
    "updated created_at timestamp must still be valid",
    !Number.isNaN(updatedCreatedAt),
  );
  TestValidator.predicate(
    "updated updated_at timestamp must be valid",
    !Number.isNaN(updatedUpdatedAt),
  );

  TestValidator.predicate(
    "updated_at should be later than or equal to previous updated_at",
    updatedUpdatedAt >= createdUpdatedAt,
  );

  TestValidator.predicate(
    "updated_at should be later than or equal to created_at",
    updatedUpdatedAt >= createdCreatedAt,
  );
}
