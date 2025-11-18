import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductLocalization } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductLocalization";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

export async function test_api_admin_product_localization_detail_mismatched_product_and_localization(
  connection: api.IConnection,
) {
  // 1. Register admin and seller actors
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const sellerJoinBody = typia.random<IShoppingMallSellerAuthJoin.IRequest>();
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 2. As seller, create two distinct products (productA and productB)
  const productABody = typia.random<IShoppingMallProduct.ICreate>();
  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productABody,
    });
  typia.assert(productA);

  const productBBody = typia.random<IShoppingMallProduct.ICreate>();
  const productB: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBBody,
    });
  typia.assert(productB);

  // 3. As seller, create a localization for productA
  const localizationBody =
    typia.random<IShoppingMallProductLocalization.ICreate>();
  const localizationA: IShoppingMallProductLocalization =
    await api.functional.shoppingMall.seller.products.localizations.create(
      connection,
      {
        productId: productA.id,
        body: localizationBody,
      },
    );
  typia.assert(localizationA);
  TestValidator.equals(
    "localizationA belongs to productA",
    localizationA.product_id,
    productA.id,
  );

  // 4. As admin, create category and link both products for realistic context
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: adminJoinBody.ip ?? null,
    href: adminJoinBody.href,
    referrer: adminJoinBody.referrer,
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  const categoryBody = typia.random<IShoppingMallCategory.ICreate>();
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  const linkProductACategoryBody =
    typia.random<IShoppingMallProductCategory.ICreate>();
  const productACategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: productA.id,
        body: linkProductACategoryBody,
      },
    );
  typia.assert(productACategory);

  const linkProductBCategoryBody =
    typia.random<IShoppingMallProductCategory.ICreate>();
  const productBCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: productB.id,
        body: linkProductBCategoryBody,
      },
    );
  typia.assert(productBCategory);

  // 5. Mismatched lookup: use productB.id with localizationA.id
  await TestValidator.error(
    "admin cannot fetch localization with mismatched productId and localizationId",
    async () => {
      await api.functional.shoppingMall.admin.products.localizations.at(
        connection,
        {
          productId: productB.id,
          productLocalizationId: localizationA.id,
        },
      );
    },
  );

  // 6. Sanity check: correct parent-child pair should be retrievable
  const localizationAFromAdmin: IShoppingMallProductLocalization =
    await api.functional.shoppingMall.admin.products.localizations.at(
      connection,
      {
        productId: productA.id,
        productLocalizationId: localizationA.id,
      },
    );
  typia.assert(localizationAFromAdmin);
  TestValidator.equals(
    "admin can fetch localization when productId matches",
    localizationAFromAdmin.id,
    localizationA.id,
  );
  TestValidator.equals(
    "admin fetch preserves localization's product_id",
    localizationAFromAdmin.product_id,
    productA.id,
  );
}
