import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardStatusType";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_status_types_filter_by_code_and_active(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin using utility function
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // First, get all status types to understand what's available
  const allStatusTypes =
    await api.functional.discussionBoard.admin.status_types.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardStatusType.IRequest,
      },
    );
  typia.assert(allStatusTypes);
  // Test 1: Filter by code containing 'pending' and active status true
  const response1 =
    await api.functional.discussionBoard.admin.status_types.index(
      adminConnection,
      {
        body: {
          code: "pending",
          isActive: true,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardStatusType.IRequest,
      },
    );
  typia.assert(response1);
  // Validate all returned items are active and contain 'pending' in code
  for (const statusType of response1.data) {
    TestValidator.predicate("status type is active", statusType.is_active);
    TestValidator.predicate(
      "status code contains 'pending'",
      statusType.code.toLowerCase().includes("pending"),
    );
  }
  // Test 2: Test pagination with different page
  const response2 =
    await api.functional.discussionBoard.admin.status_types.index(
      adminConnection,
      {
        body: {
          code: "pending",
          isActive: true,
          page: 2,
          limit: 5,
        } satisfies IDiscussionBoardStatusType.IRequest,
      },
    );
  typia.assert(response2);
  // Test 3: Test empty result set with non-matching filters
  const response3 =
    await api.functional.discussionBoard.admin.status_types.index(
      adminConnection,
      {
        body: {
          code: "nonexistent_code_12345",
          isActive: true,
        } satisfies IDiscussionBoardStatusType.IRequest,
      },
    );
  typia.assert(response3);
  TestValidator.equals("empty result set", response3.data.length, 0);
  // Test 4: Test with only code filter
  const response4 =
    await api.functional.discussionBoard.admin.status_types.index(
      adminConnection,
      {
        body: {
          code: "pending",
        } satisfies IDiscussionBoardStatusType.IRequest,
      },
    );
  typia.assert(response4);
  // Test 5: Test with only active filter
  const response5 =
    await api.functional.discussionBoard.admin.status_types.index(
      adminConnection,
      {
        body: {
          isActive: true,
        } satisfies IDiscussionBoardStatusType.IRequest,
      },
    );
  typia.assert(response5);
  // Test 6: Test with inactive filter
  const response6 =
    await api.functional.discussionBoard.admin.status_types.index(
      adminConnection,
      {
        body: {
          isActive: false,
        } satisfies IDiscussionBoardStatusType.IRequest,
      },
    );
  typia.assert(response6);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page valid",
    response1.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit valid",
    response1.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records valid",
    response1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages valid",
    response1.pagination.pages >= 0,
  );
}
