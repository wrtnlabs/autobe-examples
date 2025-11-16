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
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

export async function test_api_product_option_type_creation_requires_multi_sku_product(
  connection: api.IConnection,
) {
  // 1. Register a new seller and obtain authorized session
  const sellerJoinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinRequest,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 2. Register and login as platform admin to create a brand
  const platformAdminJoinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.test.shoppingmall.local/join",
    referrer: "https://admin.test.shoppingmall.local/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinRequest,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(platformAdminAuthorized);

  const platformAdminLoginRequest = {
    email: platformAdminJoinRequest.email,
    password: platformAdminJoinRequest.password,
    ip: null,
    href: "https://admin.test.shoppingmall.local/login",
    referrer: "https://admin.test.shoppingmall.local/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginRequest,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(platformAdminLoggedIn);

  // 3. Create a brand as platform admin
  const brandCreateRequest = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri:
      "https://cdn.test.shoppingmall.local/logo/" +
      RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateRequest,
    });
  typia.assert<IShoppingMallBrand>(brand);

  TestValidator.equals(
    "created brand name should match input",
    brand.name,
    brandCreateRequest.name,
  );
  TestValidator.equals(
    "created brand slug should match input",
    brand.slug,
    brandCreateRequest.slug,
  );

  // 4. Log back in as the seller to perform product and option type operations
  const sellerLoginRequest = {
    email: sellerJoinRequest.email,
    password: sellerJoinRequest.password,
    ip: null,
    href: "https://seller.test.shoppingmall.local/login",
    referrer: "https://seller.test.shoppingmall.local/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginRequest,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLoggedIn);

  // 5. Create a non-multi-SKU product (is_multi_sku = false)
  const productCreateRequest = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    short_description: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: false,
    primary_image_uri:
      "https://cdn.test.shoppingmall.local/product/" +
      RandomGenerator.alphaNumeric(24),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateRequest,
    });
  typia.assert<IShoppingMallProduct>(product);

  TestValidator.equals(
    "product code should match input",
    product.code,
    productCreateRequest.code,
  );
  TestValidator.equals(
    "product is_multi_sku should be false",
    product.is_multi_sku,
    productCreateRequest.is_multi_sku,
  );

  // 6. Create an option type for this single-SKU product
  const optionTypeCreateRequest = {
    name: "Color",
    display_name: "Color",
    display_order: 0,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: product.code,
        body: optionTypeCreateRequest,
      },
    );
  typia.assert<IShoppingMallProductOptionType>(optionType);

  // 7. Business-level assertions on created option type
  TestValidator.equals(
    "option type name should match input",
    optionType.name,
    optionTypeCreateRequest.name,
  );
  TestValidator.equals(
    "option type display_name should match input",
    optionType.display_name,
    optionTypeCreateRequest.display_name,
  );
  TestValidator.equals(
    "option type display_order should match input",
    optionType.display_order,
    optionTypeCreateRequest.display_order,
  );

  await TestValidator.predicate(
    "option type display_order should be non-negative",
    async () => optionType.display_order >= 0,
  );
}
