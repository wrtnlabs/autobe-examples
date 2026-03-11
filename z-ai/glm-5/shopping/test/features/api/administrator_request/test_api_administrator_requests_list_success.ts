import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministratorPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorPasswordReset";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test successful retrieval of administrator requests list by a super administrator.
 * 1. Create an administrator account and authenticate
 * 2. Call PATCH /shoppingMall/administrator/administrator-requests with pagination
 * 3. Verify response structure and pagination metadata
 * 4. Verify request entries contain all required fields
 * 5. Test status filtering works correctly
 * 6. Verify sorting order by created_at descending
 */
export async function test_api_administrator_requests_list_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // 2. Call administrator-requests endpoint with pagination
  const pageResult =
    await api.functional.shoppingMall.administrator.administrator_requests.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAdministratorPasswordReset.IRequest,
      },
    );
  typia.assert(pageResult);
  // 3. Verify pagination metadata - business logic validation
  TestValidator.equals(
    "pagination current page",
    pageResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", pageResult.pagination.limit, 10);
  TestValidator.predicate(
    "total records matches data length",
    pageResult.pagination.records >= pageResult.data.length,
  );
  // 4. Verify sorting order - created_at descending (newest first)
  if (pageResult.data.length > 1) {
    for (let i = 0; i < pageResult.data.length - 1; i++) {
      const currentCreatedAt = new Date(
        pageResult.data[i].created_at,
      ).getTime();
      const nextCreatedAt = new Date(
        pageResult.data[i + 1].created_at,
      ).getTime();
      TestValidator.predicate(
        `requests sorted by created_at descending at index ${i}`,
        currentCreatedAt >= nextCreatedAt,
      );
    }
  }
  // 5. Test with status filter - verify filter works correctly
  const pendingResult =
    await api.functional.shoppingMall.administrator.administrator_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 5,
        } satisfies IShoppingMallAdministratorPasswordReset.IRequest,
      },
    );
  typia.assert(pendingResult);
  // Verify all returned requests have pending status - business logic
  for (const request of pendingResult.data) {
    TestValidator.equals(
      "filtered status is pending",
      request.status,
      "pending",
    );
  }
  // 6. Test with approved status filter
  const approvedResult =
    await api.functional.shoppingMall.administrator.administrator_requests.index(
      adminConnection,
      {
        body: {
          status: "approved",
          page: 1,
          limit: 5,
        } satisfies IShoppingMallAdministratorPasswordReset.IRequest,
      },
    );
  typia.assert(approvedResult);
  // Verify all returned requests have approved status and reviewer is populated
  for (const request of approvedResult.data) {
    TestValidator.equals(
      "filtered status is approved",
      request.status,
      "approved",
    );
    // Business rule: approved requests should have reviewer populated
    TestValidator.predicate(
      "approved request has reviewer",
      request.reviewer !== null,
    );
    TestValidator.predicate(
      "approved request has reviewed_at",
      request.reviewed_at !== null,
    );
  }
}
