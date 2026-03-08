import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorRequest";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_pending_requests_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test 1: Get first page with default parameters
  const response1 =
    await api.functional.discussionBoard.superAdmin.requests.pending.index(
      adminConnection,
      {
        body: {
          status: "pending",
        } satisfies IDiscussionBoardAdministratorRequest.IRequest,
      },
    );
  typia.assert(response1);
  // Validate pagination structure
  TestValidator.predicate("pagination exists", () => !!response1.pagination);
  TestValidator.equals("current page is 1", response1.pagination.current, 1);
  TestValidator.predicate(
    "records exists",
    () => response1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages exists",
    () => response1.pagination.pages >= 0,
  );
  // Validate data array structure
  TestValidator.predicate("data array exists", () =>
    Array.isArray(response1.data),
  );
  if (response1.data.length > 0) {
    const firstItem = response1.data[0];
    TestValidator.equals(
      "first item has status",
      typeof firstItem.status,
      "string",
    );
    TestValidator.equals(
      "first item has submitted_at",
      typeof firstItem.submitted_at,
      "string",
    );
    TestValidator.predicate(
      "first item has rejection_reason",
      () =>
        firstItem.rejection_reason === null ||
        typeof firstItem.rejection_reason === "string",
    );
  }
  // Test 2: Get with custom limit
  const limit = 5;
  const response2 =
    await api.functional.discussionBoard.superAdmin.requests.pending.index(
      adminConnection,
      {
        body: {
          status: "pending",
          limit: limit,
        } satisfies IDiscussionBoardAdministratorRequest.IRequest,
      },
    );
  typia.assert(response2);
  TestValidator.equals("limit matches", response2.pagination.limit, limit);
  TestValidator.predicate(
    "data length <= limit",
    () => response2.data.length <= limit,
  );
  // Test 3: Get second page
  const response3 =
    await api.functional.discussionBoard.superAdmin.requests.pending.index(
      adminConnection,
      {
        body: {
          status: "pending",
          page: 2,
        } satisfies IDiscussionBoardAdministratorRequest.IRequest,
      },
    );
  typia.assert(response3);
  TestValidator.equals("current page is 2", response3.pagination.current, 2);
  // Test 4: Verify sorting (newest first)
  if (response1.data.length >= 2) {
    const date1 = new Date(response1.data[0].submitted_at).getTime();
    const date2 = new Date(response1.data[1].submitted_at).getTime();
    TestValidator.predicate(
      "sorted by submitted_at descending",
      () => date1 >= date2,
    );
  }
  // Test 5: Empty page handling
  const response4 =
    await api.functional.discussionBoard.superAdmin.requests.pending.index(
      adminConnection,
      {
        body: {
          status: "pending",
          page: 999999,
        } satisfies IDiscussionBoardAdministratorRequest.IRequest,
      },
    );
  typia.assert(response4);
  TestValidator.equals(
    "empty page returns empty data",
    response4.data.length,
    0,
  );
}
