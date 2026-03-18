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

export async function test_api_administrator_seller_directory_filtering(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  const page = 1;
  const limit = 10;
  const baseRequest = {
    page,
    limit,
  } satisfies IShoppingMallSeller.IRequest;
  const firstResponse =
    await api.functional.shoppingMall.administrator.sellers.index(
      adminConnection,
      {
        body: baseRequest,
      },
    );
  typia.assert(firstResponse);
  const secondResponse =
    await api.functional.shoppingMall.administrator.sellers.index(
      adminConnection,
      {
        body: baseRequest,
      },
    );
  typia.assert(secondResponse);
  TestValidator.equals(
    "seller directory pagination metadata should be deterministic",
    firstResponse.pagination,
    secondResponse.pagination,
  );
  TestValidator.equals(
    "seller directory results should be deterministic for identical requests",
    firstResponse.data,
    secondResponse.data,
  );
  TestValidator.predicate(
    "seller directory response should be paginated",
    firstResponse.pagination.current === page &&
      firstResponse.pagination.limit === limit,
  );
  TestValidator.predicate(
    "seller directory result count should not exceed requested limit",
    firstResponse.data.length <= limit,
  );
  for (const seller of firstResponse.data) {
    typia.assert(seller);
    TestValidator.predicate(
      "seller summary should contain a seller profile summary",
      seller.sellerProfile !== null && seller.sellerProfile !== undefined,
    );
  }
  const approvalCandidates = firstResponse.data.filter(
    (seller) => seller.approvalStatus.length > 0,
  );
  if (approvalCandidates.length > 0) {
    const approvalStatus = approvalCandidates[0]!.approvalStatus;
    const approvalResponse =
      await api.functional.shoppingMall.administrator.sellers.index(
        adminConnection,
        {
          body: {
            approvalStatus,
            page,
            limit,
          } satisfies IShoppingMallSeller.IRequest,
        },
      );
    typia.assert(approvalResponse);
    TestValidator.predicate(
      "approval-status filter should only return matching sellers",
      approvalResponse.data.every(
        (seller) => seller.approvalStatus === approvalStatus,
      ),
    );
    TestValidator.predicate(
      "approval-status filter should exclude non-matching sellers when present",
      approvalResponse.data.every((seller) => seller.approvalStatus !== ""),
    );
  }
  const accountCandidates = firstResponse.data.filter(
    (seller) => seller.accountStatus.length > 0,
  );
  if (accountCandidates.length > 0) {
    const accountStatus = accountCandidates[0]!.accountStatus;
    const accountResponse =
      await api.functional.shoppingMall.administrator.sellers.index(
        adminConnection,
        {
          body: {
            accountStatus,
            page,
            limit,
          } satisfies IShoppingMallSeller.IRequest,
        },
      );
    typia.assert(accountResponse);
    TestValidator.predicate(
      "account-status filter should only return matching sellers",
      accountResponse.data.every(
        (seller) => seller.accountStatus === accountStatus,
      ),
    );
    TestValidator.predicate(
      "account-status filter should exclude non-matching sellers when present",
      accountResponse.data.every((seller) => seller.accountStatus !== ""),
    );
  }
  const keywordSource = firstResponse.data.find(
    (seller) =>
      seller.email.length > 0 ||
      (seller.sellerProfile !== null &&
        seller.sellerProfile !== undefined &&
        seller.sellerProfile.shopName.length > 0),
  );
  if (keywordSource !== undefined) {
    const keyword =
      keywordSource.sellerProfile !== null &&
      keywordSource.sellerProfile !== undefined &&
      keywordSource.sellerProfile.shopName.length > 0
        ? RandomGenerator.substring(keywordSource.sellerProfile.shopName)
        : RandomGenerator.substring(keywordSource.email);
    const keywordResponse =
      await api.functional.shoppingMall.administrator.sellers.index(
        adminConnection,
        {
          body: {
            search: keyword,
            page,
            limit,
          } satisfies IShoppingMallSeller.IRequest,
        },
      );
    typia.assert(keywordResponse);
    TestValidator.predicate(
      "keyword filter should return sellers whose email or shop name matches the search term",
      keywordResponse.data.every(
        (seller) =>
          seller.email.includes(keyword) ||
          (seller.sellerProfile !== null &&
            seller.sellerProfile !== undefined &&
            seller.sellerProfile.shopName.includes(keyword)),
      ),
    );
  }
  TestValidator.equals(
    "seller directory responses should remain deterministic on repeat calls",
    firstResponse.data.map((seller) => seller.id),
    secondResponse.data.map((seller) => seller.id),
  );
}
