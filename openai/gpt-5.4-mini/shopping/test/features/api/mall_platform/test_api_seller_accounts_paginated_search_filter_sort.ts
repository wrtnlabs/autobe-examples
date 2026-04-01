import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_accounts_paginated_search_filter_sort(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const request: IMallPlatformSellerAccount.IRequest = {
    page: 1,
    limit: 10,
    sort: "+createdAt",
  };
  const firstResponse =
    await api.functional.mallPlatform.administrator.sellerAccounts.index(
      adminConnection,
      {
        body: request,
      },
    );
  typia.assert(firstResponse);
  const secondResponse =
    await api.functional.mallPlatform.administrator.sellerAccounts.index(
      adminConnection,
      {
        body: request,
      },
    );
  typia.assert(secondResponse);
  TestValidator.equals(
    "pagination metadata should be stable across identical requests",
    firstResponse.pagination,
    secondResponse.pagination,
  );
  TestValidator.equals(
    "result rows should be stable across identical requests",
    firstResponse.data,
    secondResponse.data,
  );
  TestValidator.predicate(
    "pagination metadata should be non-negative",
    firstResponse.pagination.current >= 0 &&
      firstResponse.pagination.limit >= 0 &&
      firstResponse.pagination.records >= 0 &&
      firstResponse.pagination.pages >= 0,
  );
  for (const seller of firstResponse.data) {
    typia.assert(seller);
  }
  const page = firstResponse.pagination;
  if (page.pages > 1) {
    const nextResponse =
      await api.functional.mallPlatform.administrator.sellerAccounts.index(
        adminConnection,
        {
          body: {
            ...request,
            page: 2,
          } satisfies IMallPlatformSellerAccount.IRequest,
        },
      );
    typia.assert(nextResponse);
    TestValidator.notEquals(
      "different pages should not return the same data when more than one page exists",
      firstResponse.data,
      nextResponse.data,
    );
  }
  const filteredResponse =
    await api.functional.mallPlatform.administrator.sellerAccounts.index(
      adminConnection,
      {
        body: {
          ...request,
          approvalStatus: "pending",
        } satisfies IMallPlatformSellerAccount.IRequest,
      },
    );
  typia.assert(filteredResponse);
  for (const seller of filteredResponse.data) {
    typia.assert(seller);
    TestValidator.equals(
      "approval status filter should be applied consistently",
      seller.approvalStatus,
      "pending",
    );
  }
}
