import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerApprovalRequest";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_approval_pending_queue_pagination(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(authorized);
  const pageSize = 3;
  const firstPage =
    await api.functional.shoppingMall.administrator.seller_approval_requests.pending.index(
      adminConnection,
      {
        body: {
          status: null,
          shoppingMallSellerId: null,
          rejectionReason: null,
          createdAtFrom: null,
          createdAtTo: null,
          updatedAtFrom: null,
          updatedAtTo: null,
          page: 1,
          limit: pageSize,
          sort: "created_at",
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals(
    "first page limit",
    firstPage.pagination.limit,
    pageSize,
  );
  TestValidator.predicate(
    "first page data length does not exceed page size",
    firstPage.data.length <= pageSize,
  );
  TestValidator.predicate(
    "first page record count is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "first page page count is non-negative",
    firstPage.pagination.pages >= 0,
  );
  for (const record of firstPage.data) {
    TestValidator.equals(
      "first page pending-only status",
      record.status,
      "pending",
    );
  }
  const secondPage =
    await api.functional.shoppingMall.administrator.seller_approval_requests.pending.index(
      adminConnection,
      {
        body: {
          status: null,
          shoppingMallSellerId: null,
          rejectionReason: null,
          createdAtFrom: null,
          createdAtTo: null,
          updatedAtFrom: null,
          updatedAtTo: null,
          page: 2,
          limit: pageSize,
          sort: "created_at",
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals(
    "second page limit",
    secondPage.pagination.limit,
    pageSize,
  );
  TestValidator.predicate(
    "second page data length does not exceed page size",
    secondPage.data.length <= pageSize,
  );
  TestValidator.equals(
    "page metadata records remain consistent",
    secondPage.pagination.records,
    firstPage.pagination.records,
  );
  TestValidator.equals(
    "page metadata page count remains consistent",
    secondPage.pagination.pages,
    firstPage.pagination.pages,
  );
  for (const record of secondPage.data) {
    TestValidator.equals(
      "second page pending-only status",
      record.status,
      "pending",
    );
  }
  if (firstPage.data.length > 0 && secondPage.data.length > 0) {
    TestValidator.notEquals(
      "later page should contain different queue items when multiple pages exist",
      firstPage.data[0].id,
      secondPage.data[0].id,
    );
  }
}
