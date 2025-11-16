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

export async function test_api_product_option_value_creation_with_display_order_collision(
  connection: api.IConnection,
) {
  // 1. Register a seller (join) and obtain authenticated seller context
  const sellerJoinBody = typia.random<IShoppingMallSellerJoin.IRequest>();

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerId = sellerAuthorized.seller.id as string & tags.Format<"uuid">;

  // 2. Platform admin joins and creates a brand, then we switch back to seller
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
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

  const brandCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // Switch back to seller context via seller login
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerReLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerReLogin);

  // 3. Create a multi-SKU product for the seller
  const productCode = typia.random<string & tags.MinLength<1>>();

  const productCreateBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: typia.random<string & tags.MinLength<1>>(),
    short_description: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: typia.random<string & tags.MinLength<1>>(),
    is_multi_sku: true,
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  const createdProductCode: string = product.code;

  // 4. Create a product option type for that product
  const optionTypeDisplayOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();

  const optionTypeCreateBody = {
    name: "Color",
    display_name: "Color",
    display_order: optionTypeDisplayOrder,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: createdProductCode,
        body: optionTypeCreateBody,
      },
    );
  typia.assert(optionType);

  const optionTypeId: string = optionType.id;

  // 5. Create first option value with display_order = 1
  const firstValueBody = {
    value: "BLUE",
    display_name: "Blue",
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const firstValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: createdProductCode,
        productOptionTypeId: optionTypeId,
        body: firstValueBody,
      },
    );
  typia.assert(firstValue);

  TestValidator.equals(
    "first option value display_order must match request body",
    firstValue.display_order,
    firstValueBody.display_order,
  );
  TestValidator.equals(
    "first option value optionType id must match created option type",
    optionTypeId,
    firstValue.optionType.id,
  );

  // 6. Attempt to create second option value with same display_order and expect error
  const secondValueBody = {
    value: "RED",
    display_name: "Red",
    display_order: firstValueBody.display_order,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  await TestValidator.error(
    "creating a second option value with duplicate display_order should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.optionTypes.values.create(
        connection,
        {
          productCode: createdProductCode,
          productOptionTypeId: optionTypeId,
          body: secondValueBody,
        },
      );
    },
  );
}
