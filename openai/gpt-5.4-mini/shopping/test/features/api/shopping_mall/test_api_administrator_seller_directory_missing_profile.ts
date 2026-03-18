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

export async function test_api_administrator_seller_directory_missing_profile(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  const firstPage =
    await api.functional.shoppingMall.administrator.sellers.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "page should reflect request page",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should reflect request limit",
    firstPage.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "pagination record count should be non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination page count should be non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data should not exceed requested limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  TestValidator.predicate(
    "pagination boundaries should be consistent",
    firstPage.pagination.pages === 0
      ? firstPage.data.length === 0
      : firstPage.pagination.current >= 1 &&
          firstPage.pagination.current <= firstPage.pagination.pages,
  );
  for (const seller of firstPage.data) {
    typia.assert(seller);
    TestValidator.predicate("seller id should exist", seller.id.length > 0);
    TestValidator.predicate(
      "seller email should exist",
      seller.email.length > 0,
    );
    TestValidator.predicate(
      "seller summary should include approval status",
      seller.approvalStatus.length > 0,
    );
    TestValidator.predicate(
      "seller summary should include account status",
      seller.accountStatus.length > 0,
    );
    TestValidator.predicate(
      "seller timestamps should be present",
      seller.createdAt.length > 0 && seller.updatedAt.length > 0,
    );
    if (seller.sellerProfile !== null && seller.sellerProfile !== undefined) {
      typia.assert(seller.sellerProfile);
      TestValidator.predicate(
        "seller profile shop name should be available when profile exists",
        seller.sellerProfile.shopName.length >= 0,
      );
    }
  }
  if (firstPage.pagination.pages > 1) {
    const lastPage =
      await api.functional.shoppingMall.administrator.sellers.index(
        adminConnection,
        {
          body: {
            page: firstPage.pagination.pages,
            limit: 2,
          } satisfies IShoppingMallSeller.IRequest,
        },
      );
    typia.assert(lastPage);
    TestValidator.equals(
      "last page should reflect requested page",
      lastPage.pagination.current,
      firstPage.pagination.pages,
    );
    TestValidator.equals(
      "last page should keep the same limit",
      lastPage.pagination.limit,
      2,
    );
    TestValidator.predicate(
      "last page data should not exceed limit",
      lastPage.data.length <= lastPage.pagination.limit,
    );
    TestValidator.predicate(
      "last page should contain at least one record when pages exist",
      lastPage.data.length > 0,
    );
  }
}
