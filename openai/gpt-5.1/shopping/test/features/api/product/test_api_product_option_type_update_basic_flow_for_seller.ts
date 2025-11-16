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

export async function test_api_product_option_type_update_basic_flow_for_seller(
  connection: api.IConnection,
) {
  // 1. Seller join to obtain seller context
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

  // 2. Platform admin join and brand creation
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(14),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(platformAdminAuthorized);

  // Now connection holds platformAdmin token; create a brand
  const brandCreateBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.example.com/logo/" + RandomGenerator.alphaNumeric(8),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert<IShoppingMallBrand>(brand);

  // 3. Switch back to seller context via login to ensure seller token
  const sellerLoginBody = {
    email: sellerAuthorized.email,
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

  // 4. Create a new multi-SKU product for this seller referencing the brand
  const productCode: string = "CODE-" + RandomGenerator.alphaNumeric(10);

  const productCreateBody = {
    shopping_mall_seller_id: sellerLoggedIn.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.name(3),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.example.com/product/" + RandomGenerator.alphaNumeric(12),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  TestValidator.equals(
    "created product code matches requested code",
    product.code,
    productCode,
  );

  // 5. Create the initial option type for this product
  const initialOptionTypeBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const createdOptionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: product.code,
        body: initialOptionTypeBody,
      },
    );
  typia.assert<IShoppingMallProductOptionType>(createdOptionType);

  // 6. Update the option type: change name, display_name, and display_order
  const updatedName = "Colour";
  const updatedDisplayName = "Colour (UK)";
  const updatedDisplayOrder = 1 as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;

  const updateBody = {
    name: updatedName,
    display_name: updatedDisplayName,
    display_order: updatedDisplayOrder,
  } satisfies IShoppingMallProductOptionType.IUpdate;

  const updatedOptionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.update(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: createdOptionType.id,
        body: updateBody,
      },
    );
  typia.assert<IShoppingMallProductOptionType>(updatedOptionType);

  // 7. Validate that id and created_at are preserved while other fields update
  TestValidator.equals(
    "option type id should remain unchanged after update",
    updatedOptionType.id,
    createdOptionType.id,
  );

  TestValidator.equals(
    "created_at should remain unchanged after update",
    updatedOptionType.created_at,
    createdOptionType.created_at,
  );

  TestValidator.equals(
    "name should be updated to new value",
    updatedOptionType.name,
    updatedName,
  );

  TestValidator.equals(
    "display_name should be updated to new value",
    updatedOptionType.display_name,
    updatedDisplayName,
  );

  TestValidator.equals(
    "display_order should be updated to new value",
    updatedOptionType.display_order,
    updatedDisplayOrder,
  );

  TestValidator.predicate(
    "updated_at should reflect an update (changed or at least not earlier than created_at)",
    new Date(updatedOptionType.updated_at).getTime() >=
      new Date(createdOptionType.created_at).getTime(),
  );
}
