import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductOptionType";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

export async function test_api_seller_product_option_types_list_unauthorized_seller(
  connection: api.IConnection,
) {
  // 1. Register Seller A
  const sellerAJoin: IShoppingMallSellerJoin.IRequest =
    typia.random<IShoppingMallSellerJoin.IRequest>();

  const sellerA: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerAJoin,
    });
  typia.assert(sellerA);

  // 2. Register Seller B
  const sellerBJoin: IShoppingMallSellerJoin.IRequest =
    typia.random<IShoppingMallSellerJoin.IRequest>();

  const sellerB: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBJoin,
    });
  typia.assert(sellerB);

  // 3. Register Platform Admin and create a brand
  const platformAdminJoin: IShoppingMallPlatformAdminJoin.IRequest =
    typia.random<IShoppingMallPlatformAdminJoin.IRequest>();

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoin,
    });
  typia.assert(platformAdmin);

  const brandCreateBody: IShoppingMallBrand.ICreate =
    typia.random<IShoppingMallBrand.ICreate>();
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 4. Login as Seller A and create a product
  const sellerALoginRequest: IShoppingMallSellerLogin.IRequest = {
    email: sellerA.email,
    password: sellerAJoin.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };

  const sellerALogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerALoginRequest,
    });
  typia.assert(sellerALogin);

  const productCodeA: string = RandomGenerator.alphaNumeric(12);

  const productACreateBody = {
    shopping_mall_seller_id: sellerA.id,
    shopping_mall_brand_id: brand.id,
    code: productCodeA,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productACreateBody,
    });
  typia.assert(productA);

  // 5. Create option types for Seller A's product
  const optionTypesA: IShoppingMallProductOptionType[] = [];
  for (let index = 0; index < 3; index++) {
    const createdOptionType: IShoppingMallProductOptionType =
      await api.functional.shoppingMall.seller.products.optionTypes.create(
        connection,
        {
          productCode: productA.code,
          body: {
            name: `Option-${index}`,
            display_name: `Option Display ${index}`,
            display_order: index as number &
              tags.Type<"int32"> &
              tags.Minimum<0>,
          } satisfies IShoppingMallProductOptionType.ICreate,
        },
      );
    typia.assert(createdOptionType);
    optionTypesA.push(createdOptionType);
  }

  // 6. Login as Seller B and attempt to list Seller A's option types (should fail)
  const sellerBLoginRequest: IShoppingMallSellerLogin.IRequest = {
    email: sellerB.email,
    password: sellerBJoin.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };

  const sellerBLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerBLoginRequest,
    });
  typia.assert(sellerBLogin);

  await TestValidator.error(
    "seller B cannot list option types of seller A's product",
    async () => {
      await api.functional.shoppingMall.seller.products.optionTypes.index(
        connection,
        {
          productCode: productA.code,
          body: {
            page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
            limit: 10 as number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<200>,
          } satisfies IShoppingMallProductOptionType.IRequest,
        },
      );
    },
  );

  // 7. Create Seller B's own product and option types
  const productCodeB: string = RandomGenerator.alphaNumeric(12);

  const productBCreateBody = {
    shopping_mall_seller_id: sellerB.id,
    shopping_mall_brand_id: brand.id,
    code: productCodeB,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const productB: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBCreateBody,
    });
  typia.assert(productB);

  const optionTypesB: IShoppingMallProductOptionType[] = [];
  for (let index = 0; index < 2; index++) {
    const createdOptionType: IShoppingMallProductOptionType =
      await api.functional.shoppingMall.seller.products.optionTypes.create(
        connection,
        {
          productCode: productB.code,
          body: {
            name: `SellerB-Option-${index}`,
            display_name: `SellerB Option Display ${index}`,
            display_order: index as number &
              tags.Type<"int32"> &
              tags.Minimum<0>,
          } satisfies IShoppingMallProductOptionType.ICreate,
        },
      );
    typia.assert(createdOptionType);
    optionTypesB.push(createdOptionType);
  }

  // 8. Seller B lists their own option types (should succeed)
  const pageRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
  } satisfies IShoppingMallProductOptionType.IRequest;

  const optionTypesPage: IPageIShoppingMallProductOptionType.ISummary =
    await api.functional.shoppingMall.seller.products.optionTypes.index(
      connection,
      {
        productCode: productB.code,
        body: pageRequestBody,
      },
    );
  typia.assert(optionTypesPage);

  // 9. Validate that the page includes Seller B's option types
  TestValidator.predicate(
    "pagination.records should be >= number of created option types for seller B",
    optionTypesPage.pagination.records >= optionTypesB.length,
  );

  const foundIds = optionTypesB.map((o) => o.id);
  const hasAtLeastOne = optionTypesPage.data.some((summary) =>
    foundIds.includes(summary.id),
  );

  TestValidator.predicate(
    "listing own product's option types should contain at least one of created option types",
    hasAtLeastOne,
  );
}
