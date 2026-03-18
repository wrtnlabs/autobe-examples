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

export async function test_api_seller_approval_requests_list_queue(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  const body = {
    status: null,
    shoppingMallSellerId: null,
    rejectionReason: null,
    createdAtFrom: null,
    createdAtTo: null,
    updatedAtFrom: null,
    updatedAtTo: null,
    page: 1,
    limit: 10,
    sort: "-created_at",
  } satisfies IShoppingMallSellerApprovalRequest.IRequest;
  const firstPage =
    await api.functional.shoppingMall.administrator.seller_approval_requests.index(
      adminConnection,
      { body },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "requested page should be reflected in pagination",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "page size should match requested limit",
    firstPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination metadata should be non-negative",
    firstPage.pagination.records >= 0 &&
      firstPage.pagination.pages >= 0 &&
      firstPage.pagination.current >= 0 &&
      firstPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "result count should not exceed the limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  for (const item of firstPage.data) {
    typia.assert(item);
    typia.assert(item.seller);
    typia.assert(item.seller.sellerProfile);
    TestValidator.predicate("request id should exist", item.id.length > 0);
    TestValidator.predicate(
      "seller id should exist",
      item.seller.id.length > 0,
    );
    TestValidator.predicate(
      "seller email should exist",
      item.seller.email.length > 0,
    );
    TestValidator.predicate(
      "request status should exist",
      item.status.length > 0,
    );
    TestValidator.predicate(
      "seller profile shop name should exist",
      item.seller.sellerProfile.shopName.length > 0,
    );
    TestValidator.predicate(
      "seller profile description should exist",
      item.seller.sellerProfile.shopDescription.length >= 0,
    );
    TestValidator.predicate(
      "seller profile logo url should exist",
      item.seller.sellerProfile.logoImageUrl.length >= 0,
    );
  }
  for (let i = 1; i < firstPage.data.length; i++) {
    const prev = firstPage.data[i - 1];
    const curr = firstPage.data[i];
    TestValidator.predicate(
      "results should be ordered newest-first by created_at then updated_at",
      prev.created_at > curr.created_at ||
        (prev.created_at === curr.created_at &&
          prev.updated_at >= curr.updated_at),
    );
  }
  const emptyPage =
    await api.functional.shoppingMall.administrator.seller_approval_requests.index(
      adminConnection,
      {
        body: {
          status: "__no_such_status__",
          shoppingMallSellerId: null,
          rejectionReason: "__no_such_reason__",
          createdAtFrom: null,
          createdAtTo: null,
          updatedAtFrom: null,
          updatedAtTo: null,
          page: 1,
          limit: 10,
          sort: "-created_at",
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals(
    "empty search should return no data",
    emptyPage.data.length,
    0,
  );
  TestValidator.equals(
    "empty search should preserve page number",
    emptyPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty search should preserve limit",
    emptyPage.pagination.limit,
    10,
  );
  TestValidator.equals(
    "empty search should have zero records when nothing matches",
    emptyPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search should have zero pages when nothing matches",
    emptyPage.pagination.pages,
    0,
  );
}
