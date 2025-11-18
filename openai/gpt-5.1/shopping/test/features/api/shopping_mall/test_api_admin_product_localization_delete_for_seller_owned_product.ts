import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductLocalization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductLocalization";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductLocalization } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductLocalization";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

export async function test_api_admin_product_localization_delete_for_seller_owned_product(
  connection: api.IConnection,
) {
  // 1. Register sellerA
  const sellerAEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerAPassword: string = typia.random<
    string & tags.Format<"password">
  >();

  const sellerAJoinBody = {
    email: sellerAEmail,
    password: sellerAPassword,
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerA: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerAJoinBody,
    });
  typia.assert(sellerA);

  // 2. Create productA for sellerA
  const productACode = RandomGenerator.alphaNumeric(12);
  const productACreateBody = {
    code: productACode,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: null,
    model_name: null,
    status: "active",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productACreateBody,
    });
  typia.assert(productA);

  // 3. Create localizationA for productA
  const localizationACreateBody = {
    locale: "en-US",
    title: RandomGenerator.paragraph({ sentences: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IShoppingMallProductLocalization.ICreate;

  const localizationA: IShoppingMallProductLocalization =
    await api.functional.shoppingMall.seller.products.localizations.create(
      connection,
      {
        productId: productA.id,
        body: localizationACreateBody,
      },
    );
  typia.assert(localizationA);

  TestValidator.equals(
    "localizationA.product_id should equal productA.id",
    localizationA.product_id,
    productA.id,
  );

  // 4. Register sellerB and create productB and localizationB to ensure isolation
  const sellerBEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerBPassword: string = typia.random<
    string & tags.Format<"password">
  >();

  const sellerBJoinBody = {
    email: sellerBEmail,
    password: sellerBPassword,
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerB: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBJoinBody,
    });
  typia.assert(sellerB);

  const productBCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: null,
    model_name: null,
    status: "active",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const productB: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBCreateBody,
    });
  typia.assert(productB);

  const localizationBCreateBody = {
    locale: "en-GB",
    title: RandomGenerator.paragraph({ sentences: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IShoppingMallProductLocalization.ICreate;

  const localizationB: IShoppingMallProductLocalization =
    await api.functional.shoppingMall.seller.products.localizations.create(
      connection,
      {
        productId: productB.id,
        body: localizationBCreateBody,
      },
    );
  typia.assert(localizationB);

  TestValidator.equals(
    "localizationB.product_id should equal productB.id",
    localizationB.product_id,
    productB.id,
  );

  // 5. Register an admin and switch Authorization to admin context
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);

  // 6. List localizations for productA via admin index and confirm localizationA is present
  const listBeforeBody = {
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    locales: undefined,
    search: undefined,
    orderBy: "created_at" as const,
    orderDirection: "desc" as const,
  } satisfies IShoppingMallProductLocalization.IRequest;

  const pageBefore: IPageIShoppingMallProductLocalization.ISummary =
    await api.functional.shoppingMall.admin.products.localizations.index(
      connection,
      {
        productId: productA.id,
        body: listBeforeBody,
      },
    );
  typia.assert(pageBefore);

  const existsBefore = ArrayUtil.has(
    pageBefore.data,
    (item) => item.id === localizationA.id,
  );

  TestValidator.predicate(
    "localizationA should be listed for productA before deletion",
    existsBefore,
  );

  // 7. Admin deletes localizationA for productA
  await api.functional.shoppingMall.admin.products.localizations.erase(
    connection,
    {
      productId: productA.id,
      productLocalizationId: localizationA.id,
    },
  );

  // 8. List localizations for productA again and ensure localizationA is gone
  const listAfterBody = {
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    locales: undefined,
    search: undefined,
    orderBy: "created_at" as const,
    orderDirection: "desc" as const,
  } satisfies IShoppingMallProductLocalization.IRequest;

  const pageAfter: IPageIShoppingMallProductLocalization.ISummary =
    await api.functional.shoppingMall.admin.products.localizations.index(
      connection,
      {
        productId: productA.id,
        body: listAfterBody,
      },
    );
  typia.assert(pageAfter);

  const existsAfter = ArrayUtil.has(
    pageAfter.data,
    (item) => item.id === localizationA.id,
  );

  TestValidator.predicate(
    "localizationA should not be listed for productA after deletion",
    () => existsAfter === false,
  );

  // 9. Verify that localizationB for productB still exists and is unaffected
  const listProductBBeforeBody = {
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    locales: undefined,
    search: undefined,
    orderBy: "created_at" as const,
    orderDirection: "desc" as const,
  } satisfies IShoppingMallProductLocalization.IRequest;

  const pageProductB: IPageIShoppingMallProductLocalization.ISummary =
    await api.functional.shoppingMall.admin.products.localizations.index(
      connection,
      {
        productId: productB.id,
        body: listProductBBeforeBody,
      },
    );
  typia.assert(pageProductB);

  const existsLocalizationB = ArrayUtil.has(
    pageProductB.data,
    (item) => item.id === localizationB.id,
  );

  TestValidator.predicate(
    "localizationB for productB should remain after deleting localizationA",
    existsLocalizationB,
  );
}
