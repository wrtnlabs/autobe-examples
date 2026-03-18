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

export async function test_api_seller_approval_requests_filter_and_paginate(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  const now = new Date();
  const createdAtFrom = new Date(
    now.getTime() - 1000 * 60 * 60 * 24 * 365,
  ).toISOString();
  const createdAtTo = new Date(
    now.getTime() + 1000 * 60 * 60 * 24,
  ).toISOString();
  const firstPage =
    await api.functional.shoppingMall.administrator.seller_approval_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          shoppingMallSellerId: null,
          rejectionReason: null,
          createdAtFrom,
          createdAtTo,
          updatedAtFrom: null,
          updatedAtTo: null,
          page: 1,
          limit: 10,
          sort: "-created_at",
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
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
  TestValidator.predicate(
    "pagination records should be non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length should not exceed limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  for (const request of firstPage.data) {
    TestValidator.equals(
      "filtered request status should match",
      request.status,
      "pending",
    );
    TestValidator.predicate(
      "created_at should be within requested range",
      request.created_at >= createdAtFrom && request.created_at <= createdAtTo,
    );
    TestValidator.predicate(
      "seller summary should contain identity fields",
      request.seller.id.length > 0 && request.seller.email.length > 0,
    );
  }
  for (let i = 1; i < firstPage.data.length; i++) {
    TestValidator.predicate(
      "first page should be sorted by newest first",
      firstPage.data[i - 1].created_at >= firstPage.data[i].created_at,
    );
  }
  if (firstPage.data.length > 0) {
    const sellerId = firstPage.data[0].seller.id;
    const sellerFilteredPage =
      await api.functional.shoppingMall.administrator.seller_approval_requests.index(
        adminConnection,
        {
          body: {
            status: "pending",
            shoppingMallSellerId: sellerId,
            rejectionReason: null,
            createdAtFrom,
            createdAtTo,
            updatedAtFrom: null,
            updatedAtTo: null,
            page: 1,
            limit: 10,
            sort: "-created_at",
          } satisfies IShoppingMallSellerApprovalRequest.IRequest,
        },
      );
    typia.assert(sellerFilteredPage);
    for (const request of sellerFilteredPage.data) {
      TestValidator.equals(
        "seller filter should keep the selected seller",
        request.seller.id,
        sellerId,
      );
      TestValidator.equals(
        "seller filter should preserve status",
        request.status,
        "pending",
      );
      TestValidator.predicate(
        "seller-filtered request should stay within date range",
        request.created_at >= createdAtFrom &&
          request.created_at <= createdAtTo,
      );
    }
  }
  if (firstPage.pagination.pages >= 2) {
    const secondPage =
      await api.functional.shoppingMall.administrator.seller_approval_requests.index(
        adminConnection,
        {
          body: {
            status: "pending",
            shoppingMallSellerId: null,
            rejectionReason: null,
            createdAtFrom,
            createdAtTo,
            updatedAtFrom: null,
            updatedAtTo: null,
            page: 2,
            limit: 10,
            sort: "-created_at",
          } satisfies IShoppingMallSellerApprovalRequest.IRequest,
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
    TestValidator.equals(
      "second page should preserve filtered record count",
      secondPage.pagination.records,
      firstPage.pagination.records,
    );
    TestValidator.equals(
      "second page should preserve filtered page count",
      secondPage.pagination.pages,
      firstPage.pagination.pages,
    );
    TestValidator.predicate(
      "second page data length should not exceed limit",
      secondPage.data.length <= secondPage.pagination.limit,
    );
    const firstIds = firstPage.data.map((request) => request.id);
    const secondIds = secondPage.data.map((request) => request.id);
    for (const id of firstIds) {
      TestValidator.predicate(
        "pages should not duplicate records",
        !secondIds.includes(id),
      );
    }
    if (firstPage.data.length > 0 && secondPage.data.length > 0) {
      TestValidator.predicate(
        "stable sort should keep page boundary order",
        firstPage.data[firstPage.data.length - 1].created_at >=
          secondPage.data[0].created_at,
      );
    }
  }
}
