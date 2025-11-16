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

/**
 * Validate sequential updates on a product option type behave as
 * last-writer-wins.
 *
 * Business flow:
 *
 * 1. Register a platform admin and obtain an authenticated context.
 * 2. As platform admin, create a brand to be associated with products.
 * 3. Register a seller and obtain an authenticated seller context.
 * 4. As seller, create a multi-SKU-capable product referencing the created brand.
 * 5. As seller, create a product option type (e.g., Material) for that product.
 * 6. Perform a first update that only changes display_name.
 * 7. Perform a second update that changes name, display_name, and display_order.
 * 8. Assert that the second update response fully reflects its payload
 *    (last-writer-wins), with stable id and productCode, and no stale data from
 *    the first update.
 */
export async function test_api_product_option_type_update_concurrency_last_writer_wins(
  connection: api.IConnection,
) {
  // 1. Register platform admin (join)
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shopping-mall.test/join",
    referrer: "https://admin.shopping-mall.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. As platform admin, create a brand
  const brandCreateBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri:
      "https://cdn.shopping-mall.test/logo/" + RandomGenerator.alphaNumeric(8),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Register seller (join) and ensure we have seller context
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
  typia.assert(sellerAuthorized);

  // 4. As seller, create a multi-SKU-capable product referencing the brand
  const productCode: string = "PRD-" + RandomGenerator.alphaNumeric(8);

  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.name(3),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.shopping-mall.test/products/" +
      RandomGenerator.alphaNumeric(10),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  TestValidator.equals(
    "product code in response matches requested code",
    product.code,
    productCode,
  );

  // 5. Create an option type for the product
  const initialOptionTypeBody = {
    name: "Material",
    display_name: "Material",
    display_order: 0,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const createdOptionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: product.code,
        body: initialOptionTypeBody,
      },
    );
  typia.assert(createdOptionType);

  TestValidator.equals(
    "created option type name matches payload",
    createdOptionType.name,
    initialOptionTypeBody.name,
  );

  // 6. First update: change only display_name
  const firstUpdateBody = {
    display_name: "Primary Material",
  } satisfies IShoppingMallProductOptionType.IUpdate;

  const firstUpdated: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.update(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: createdOptionType.id,
        body: firstUpdateBody,
      },
    );
  typia.assert(firstUpdated);

  TestValidator.equals(
    "option type id remains stable after first update",
    firstUpdated.id,
    createdOptionType.id,
  );
  TestValidator.equals(
    "first update display_name applied",
    firstUpdated.display_name,
    firstUpdateBody.display_name,
  );

  // 7. Second update: change name, display_name, and display_order
  const secondUpdateBody = {
    name: "Fabric",
    display_name: "Fabric Type",
    display_order: 1,
  } satisfies IShoppingMallProductOptionType.IUpdate;

  const secondUpdated: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.update(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: createdOptionType.id,
        body: secondUpdateBody,
      },
    );
  typia.assert(secondUpdated);

  // 8. Assertions for last-writer-wins semantics and stability
  TestValidator.equals(
    "option type id remains stable after second update",
    secondUpdated.id,
    createdOptionType.id,
  );

  TestValidator.equals(
    "second update name applied",
    secondUpdated.name,
    secondUpdateBody.name,
  );

  TestValidator.equals(
    "second update display_name applied and overwrites first update",
    secondUpdated.display_name,
    secondUpdateBody.display_name,
  );

  TestValidator.equals(
    "second update display_order applied",
    secondUpdated.display_order,
    secondUpdateBody.display_order,
  );

  TestValidator.notEquals(
    "second update display_name should differ from first update",
    secondUpdated.display_name,
    firstUpdated.display_name,
  );
}
