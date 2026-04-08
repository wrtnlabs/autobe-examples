import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_approval_request_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication via join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 2. List seller approval requests with default pagination
  const response =
    await api.functional.ecommerceMall.administrator.seller_approvals.index(
      adminConnection,
      {
        body: {
          page: 0,
          limit: 10,
        },
      },
    );
  typia.assert(response);
  // 3. Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records non-negative",
    () => response.pagination.records >= 0,
  );
  TestValidator.equals(
    "pagination pages calculated",
    response.pagination.pages,
    response.pagination.records === 0
      ? 0
      : Math.ceil(response.pagination.records / response.pagination.limit),
  );
  // 4. Validate each approval request item structure
  if (response.data.length > 0) {
    for (const request of response.data) {
      typia.assert(request);
      TestValidator.predicate("request id is uuid format", () =>
        /^[0-9a-f-]{36}$/i.test(request.id),
      );
      TestValidator.predicate("request status is valid", () =>
        ["pending", "approved", "rejected"].includes(request.status),
      );
      TestValidator.predicate("seller id is uuid format", () =>
        /^[0-9a-f-]{36}$/i.test(request.seller.id),
      );
      TestValidator.predicate(
        "seller display name exists",
        () => request.seller.display_name.length > 0,
      );
      TestValidator.predicate("seller approval status is valid", () =>
        ["pending", "approved", "rejected"].includes(
          request.seller.approval_status,
        ),
      );
      TestValidator.equals(
        "seller is_suspended is boolean",
        typeof request.seller.is_suspended,
        "boolean",
      );
      TestValidator.predicate(
        "seller created_at is date-time format",
        () => !isNaN(Date.parse(request.seller.created_at)),
      );
      // Validate seller email when present
      if (request.seller.email !== undefined && request.seller.email !== null) {
        const email = request.seller.email;
        TestValidator.predicate("seller email is valid format", () =>
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
        );
      }
      // Validate reviewer is present when status is approved/rejected
      if (request.status !== "pending") {
        TestValidator.predicate(
          "reviewer exists for non-pending",
          () => request.reviewer !== undefined,
        );
        if (request.reviewer !== undefined && request.reviewer !== null) {
          const reviewer = request.reviewer;
          typia.assert(reviewer);
          TestValidator.predicate("reviewer id is uuid format", () =>
            /^[0-9a-f-]{36}$/i.test(reviewer.id),
          );
          TestValidator.predicate(
            "reviewer display name exists",
            () => reviewer.displayName.length > 0,
          );
          TestValidator.predicate("reviewer grade is regular or super", () =>
            ["regular", "super"].includes(reviewer.grade!),
          );
          TestValidator.equals(
            "reviewer is_banned is boolean",
            typeof reviewer.isBanned,
            "boolean",
          );
        }
      } else {
        // Pending requests should not have reviewer
        TestValidator.predicate(
          "pending request has no reviewer",
          () => request.reviewer === undefined,
        );
      }
      // Validate timestamps
      TestValidator.predicate(
        "created_at is valid date-time",
        () => !isNaN(Date.parse(request.created_at)),
      );
      TestValidator.predicate(
        "updated_at is valid date-time",
        () => !isNaN(Date.parse(request.updated_at)),
      );
      // Validate rejection reason only for rejected status
      if (request.status === "rejected") {
        TestValidator.predicate(
          "rejection reason exists for rejected",
          () => request.rejection_reason !== undefined,
        );
      }
      // Validate request timestamps consistency
      TestValidator.equals(
        "updated_at >= created_at",
        new Date(request.updated_at) >= new Date(request.created_at),
        true,
      );
    }
    // 5. Validate default sorting (newest first)
    if (response.data.length > 1) {
      const sortedCorrectly = response.data.every((request, index) => {
        if (index === 0) return true;
        return (
          new Date(request.created_at) <=
          new Date(response.data[index - 1].created_at)
        );
      });
      TestValidator.predicate(
        "requests sorted by created_at descending",
        () => sortedCorrectly,
      );
    }
  }
  // 6. Test with different pagination parameters
  const largePageResponse =
    await api.functional.ecommerceMall.administrator.seller_approvals.index(
      adminConnection,
      {
        body: {
          page: 0,
          limit: 100,
        },
      },
    );
  typia.assert(largePageResponse);
  TestValidator.equals(
    "pagination limit updated",
    largePageResponse.pagination.limit,
    100,
  );
}