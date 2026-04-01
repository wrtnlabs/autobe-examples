import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerApprovalRequest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSellerApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_approval_requests_filter_by_status_and_time_range(
  connection: api.IConnection,
): Promise<void> {
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorized.token.access,
    },
  };
  const statusFilters = ["pending", "approved", "rejected"] as const;
  for (const status of statusFilters) {
    const response =
      await api.functional.mallPlatform.administrator.seller_approval_requests.index(
        adminConnection,
        {
          body: {
            status,
            page: 1,
            limit: 10,
          } satisfies IMallPlatformSellerApprovalRequest.IRequest,
        },
      );
    typia.assert(response);
    TestValidator.predicate(
      "pagination current is non-negative",
      response.pagination.current >= 0,
    );
    TestValidator.predicate(
      "pagination limit is non-negative",
      response.pagination.limit >= 0,
    );
    TestValidator.predicate(
      "pagination records is non-negative",
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages is non-negative",
      response.pagination.pages >= 0,
    );
    for (const row of response.data) {
      TestValidator.equals(
        "status filter matches response row",
        row.status,
        status,
      );
      TestValidator.predicate(
        "seller summary id exists",
        row.seller.id.length > 0,
      );
      TestValidator.predicate(
        "seller summary email exists",
        row.seller.email.length > 0,
      );
      if (status === "pending") {
        TestValidator.equals(
          "pending rows have null reviewedAt",
          row.reviewedAt,
          null,
        );
        TestValidator.equals(
          "pending rows have null rejectionReason",
          row.rejectionReason,
          null,
        );
      } else if (status === "approved") {
        TestValidator.predicate(
          "approved rows have reviewedAt",
          row.reviewedAt !== null,
        );
        TestValidator.equals(
          "approved rows have null rejectionReason",
          row.rejectionReason,
          null,
        );
      } else {
        TestValidator.predicate(
          "rejected rows have reviewedAt",
          row.reviewedAt !== null,
        );
        TestValidator.predicate(
          "rejected rows have rejectionReason",
          row.rejectionReason !== null,
        );
      }
    }
  }
  const createdAtFrom = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 90,
  ).toISOString();
  const createdAtTo = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
  const reviewedAtFrom = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 90,
  ).toISOString();
  const reviewedAtTo = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
  const ranged =
    await api.functional.mallPlatform.administrator.seller_approval_requests.index(
      adminConnection,
      {
        body: {
          createdAtFrom,
          createdAtTo,
          reviewedAtFrom,
          reviewedAtTo,
          page: 1,
          limit: 20,
        } satisfies IMallPlatformSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(ranged);
  for (const row of ranged.data) {
    TestValidator.predicate(
      "createdAt is inside requested range",
      row.createdAt >= createdAtFrom && row.createdAt <= createdAtTo,
    );
    if (row.reviewedAt !== null) {
      TestValidator.predicate(
        "reviewedAt is inside requested range",
        row.reviewedAt >= reviewedAtFrom && row.reviewedAt <= reviewedAtTo,
      );
    }
  }
  if (ranged.data.length > 0) {
    const sellerId = ranged.data[0].seller.id;
    const sellerScoped =
      await api.functional.mallPlatform.administrator.seller_approval_requests.index(
        adminConnection,
        {
          body: {
            sellerId,
            page: 1,
            limit: 20,
          } satisfies IMallPlatformSellerApprovalRequest.IRequest,
        },
      );
    typia.assert(sellerScoped);
    for (const row of sellerScoped.data) {
      TestValidator.equals(
        "seller scope returns only one seller",
        row.seller.id,
        sellerId,
      );
    }
    for (let i = 1; i < sellerScoped.data.length; i++) {
      TestValidator.predicate(
        "newest request appears first within seller scope",
        sellerScoped.data[i - 1].createdAt >= sellerScoped.data[i].createdAt,
      );
    }
  }
}
