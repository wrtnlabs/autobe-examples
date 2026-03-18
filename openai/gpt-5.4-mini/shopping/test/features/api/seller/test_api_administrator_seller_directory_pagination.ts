import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_seller_directory_pagination(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  const firstPage =
    await api.functional.shoppingMall.administrator.sellers.index(
      administratorConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "first page current should match request",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit should match request",
    firstPage.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination pages should match record count",
    firstPage.pagination.pages,
    firstPage.pagination.limit === 0
      ? 0
      : Math.ceil(firstPage.pagination.records / firstPage.pagination.limit),
  );
  TestValidator.predicate(
    "records should be at least as many as returned sellers",
    firstPage.pagination.records >= firstPage.data.length,
  );
  TestValidator.predicate(
    "page data should not exceed requested limit",
    firstPage.data.length <= 10,
  );
  for (const seller of firstPage.data) {
    typia.assert(seller);
    TestValidator.predicate("seller id should exist", seller.id.length > 0);
    TestValidator.predicate(
      "seller email should exist",
      seller.email.length > 0,
    );
    TestValidator.predicate(
      "seller approval status should exist",
      seller.approvalStatus.length > 0,
    );
    TestValidator.predicate(
      "seller account status should exist",
      seller.accountStatus.length > 0,
    );
    TestValidator.predicate(
      "seller createdAt should exist",
      seller.createdAt.length > 0,
    );
    TestValidator.predicate(
      "seller updatedAt should exist",
      seller.updatedAt.length > 0,
    );
    typia.assert(seller.sellerProfile);
    TestValidator.predicate(
      "seller profile id should exist",
      seller.sellerProfile.id.length > 0,
    );
    TestValidator.predicate(
      "seller profile shop name should exist",
      seller.sellerProfile.shopName.length > 0,
    );
    TestValidator.predicate(
      "seller profile description should exist",
      seller.sellerProfile.shopDescription.length > 0,
    );
    TestValidator.predicate(
      "seller profile logo image url should exist",
      seller.sellerProfile.logoImageUrl.length > 0,
    );
  }
  if (firstPage.pagination.pages > 1) {
    const secondPage =
      await api.functional.shoppingMall.administrator.sellers.index(
        administratorConnection,
        {
          body: {
            page: 2,
            limit: 10,
          } satisfies IShoppingMallSeller.IRequest,
        },
      );
    typia.assert(secondPage);
    TestValidator.equals(
      "second page current should match request",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals(
      "second page limit should match request",
      secondPage.pagination.limit,
      10,
    );
    TestValidator.predicate(
      "second page should contain different items when a second page exists",
      secondPage.data.length === 0 ||
        firstPage.data.length === 0 ||
        firstPage.data[0].id !== secondPage.data[0].id,
    );
    TestValidator.equals(
      "second page pagination records should match first page records",
      secondPage.pagination.records,
      firstPage.pagination.records,
    );
  }
}
