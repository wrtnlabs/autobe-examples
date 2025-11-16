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
 * Validate that product option value detail endpoint rejects mismatched
 * context.
 *
 * Business goal: Ensure that GET
 * /shoppingMall/products/{productCode}/optionTypes/{productOptionTypeId}/values/{productOptionValueId}
 * does not leak or return an option value when the provided productCode and/or
 * productOptionTypeId do not match the actual owning hierarchy of that option
 * value. The endpoint must fail (throw an HttpError) instead of returning data
 * when:
 *
 * - The productCode does not own the option type and/or value.
 * - The optionTypeId does not own the option value, even if the productCode is
 *   correct.
 *
 * High-level flow:
 *
 * 1. Bootstrap a platform admin and create a brand.
 * 2. Bootstrap a seller and authenticate.
 * 3. Create two products (A and B) under the seller, associated to the brand.
 * 4. For each product, create an option type (typeA under productA, typeB under
 *    productB).
 * 5. Under productB + typeB, create a single option value (valueB).
 * 6. Mismatch #1: Call detail endpoint with productCode from A and optionTypeId
 *    from A, but value id from B. Expect an error.
 * 7. Mismatch #2: Call detail endpoint with productCode from B but optionTypeId
 *    from A, and value id from B. Expect an error.
 *
 * In both mismatch cases we assert that an error is thrown using
 * TestValidator.error, and we never obtain an IShoppingMallProductOptionValue
 * instance from the endpoint under mismatched context.
 */
export async function test_api_product_option_value_detail_not_found_for_mismatched_context(
  connection: api.IConnection,
) {
  // 1. Platform admin bootstrap: join then login
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/start",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminJoin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminJoin);

  const platformAdminLoginBody = {
    email: platformAdminJoin.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/join-complete",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  // 2. Create a brand as platform admin
  const brandBody = {
    name: RandomGenerator.paragraph({ sentences: 1, wordMin: 4, wordMax: 10 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({
      sentences: 5,
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

  // 3. Seller bootstrap: join then login
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

  const sellerJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoin);

  const sellerLoginBody = {
    email: sellerJoin.email,
    password: sellerJoinBody.password,
    ip: "127.0.0.1",
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/join-complete",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 4. Create two products A and B for the seller
  const productACode = "PROD-A-" + RandomGenerator.alphaNumeric(8);
  const productBCode = "PROD-B-" + RandomGenerator.alphaNumeric(8);

  const productABody = {
    shopping_mall_seller_id: sellerLogin.id,
    shopping_mall_brand_id: brand.id,
    code: productACode as string & tags.MinLength<1>,
    name: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 3,
      wordMax: 10,
    }) as string & tags.MinLength<1>,
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
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.example.com/product/" + RandomGenerator.alphaNumeric(10),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productABody,
    });
  typia.assert(productA);

  const productBBody = {
    shopping_mall_seller_id: sellerLogin.id,
    shopping_mall_brand_id: brand.id,
    code: productBCode as string & tags.MinLength<1>,
    name: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 3,
      wordMax: 10,
    }) as string & tags.MinLength<1>,
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
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.example.com/product/" + RandomGenerator.alphaNumeric(10),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const productB: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBBody,
    });
  typia.assert(productB);

  // 5. Create option types for each product
  const optionTypeABody = {
    name: "Color-A",
    display_name: "Color A",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionTypeA: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: productA.code,
        body: optionTypeABody,
      },
    );
  typia.assert(optionTypeA);

  const optionTypeBBody = {
    name: "Color-B",
    display_name: "Color B",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionTypeB: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: productB.code,
        body: optionTypeBBody,
      },
    );
  typia.assert(optionTypeB);

  // 6. Create an option value under product B + optionTypeB
  const optionValueBBody = {
    value: "blue",
    display_name: "Blue",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValueB: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: productB.code,
        productOptionTypeId: optionTypeB.id,
        body: optionValueBBody,
      },
    );
  typia.assert(optionValueB);

  // 7. Mismatch scenario #1: wrong productCode and wrong option type for valueB
  await TestValidator.error(
    "option value must not be readable with mismatched product and option type context",
    async () => {
      await api.functional.shoppingMall.products.optionTypes.values.at(
        connection,
        {
          productCode: productA.code,
          productOptionTypeId: optionTypeA.id as string & tags.Format<"uuid">,
          productOptionValueId: optionValueB.id as string & tags.Format<"uuid">,
        },
      );
    },
  );

  // 8. Mismatch scenario #2: correct productCode (B) but wrong optionTypeId (A)
  await TestValidator.error(
    "option value must not be readable when option type does not own the value, even if product matches",
    async () => {
      await api.functional.shoppingMall.products.optionTypes.values.at(
        connection,
        {
          productCode: productB.code,
          productOptionTypeId: optionTypeA.id as string & tags.Format<"uuid">,
          productOptionValueId: optionValueB.id as string & tags.Format<"uuid">,
        },
      );
    },
  );
}
