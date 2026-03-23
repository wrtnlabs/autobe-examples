import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import type { IHrmPlatformActivityLogChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLogChange";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformActivityLogChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformActivityLogChange";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_activity_log_changes_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test edge cases for activity log changes retrieval.
   * 1. Authenticate member and create test activity logs
   * 2. Test non-existent activity log ID
   * 3. Test pagination boundaries (page 1, beyond total, large limit)
   * 4. Test with empty filters and specific field filters
   * 5. Verify sorting order (created_at descending)
   * 6. Validate response structure and pagination metadata
   */
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Test with non-existent activity log ID
  const nonExistentActivityLogId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const emptyChangesResponse =
    await api.functional.hrmPlatform.member.activity_logs.changes.index(
      memberConnection,
      {
        activityLogId: nonExistentActivityLogId,
        body: {} satisfies IHrmPlatformActivityLogChange.IRequest,
      },
    );
  typia.assert(emptyChangesResponse);
  TestValidator.equals(
    "empty changes for non-existent log",
    emptyChangesResponse.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records is zero",
    emptyChangesResponse.pagination.records,
    0,
  );
  // 3. Test pagination boundary: page 1 (default)
  const page1ActivityLogId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const page1Response =
    await api.functional.hrmPlatform.member.activity_logs.changes.index(
      memberConnection,
      {
        activityLogId: page1ActivityLogId,
        body: {
          page: 1,
          limit: 20,
        } satisfies IHrmPlatformActivityLogChange.IRequest,
      },
    );
  typia.assert(page1Response);
  TestValidator.equals(
    "page 1 current is 1",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit is 20",
    page1Response.pagination.limit,
    20,
  );
  // 4. Test pagination boundary: page beyond total
  const beyondPageResponse =
    await api.functional.hrmPlatform.member.activity_logs.changes.index(
      memberConnection,
      {
        activityLogId: page1ActivityLogId,
        body: {
          page: 9999,
          limit: 20,
        } satisfies IHrmPlatformActivityLogChange.IRequest,
      },
    );
  typia.assert(beyondPageResponse);
  TestValidator.equals(
    "beyond page current is 9999",
    beyondPageResponse.pagination.current,
    9999,
  );
  TestValidator.equals(
    "beyond page has no data",
    beyondPageResponse.data.length,
    0,
  );
  // 5. Test pagination boundary: large limit (max 100)
  const largeLimitResponse =
    await api.functional.hrmPlatform.member.activity_logs.changes.index(
      memberConnection,
      {
        activityLogId: page1ActivityLogId,
        body: {
          page: 1,
          limit: 100,
        } satisfies IHrmPlatformActivityLogChange.IRequest,
      },
    );
  typia.assert(largeLimitResponse);
  TestValidator.equals(
    "large limit is 100",
    largeLimitResponse.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "large limit data count within bounds",
    largeLimitResponse.data.length <= 100,
  );
  // 6. Test with empty filter parameters (retrieve all changes)
  const emptyFilterActivityLogId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const emptyFilterResponse =
    await api.functional.hrmPlatform.member.activity_logs.changes.index(
      memberConnection,
      {
        activityLogId: emptyFilterActivityLogId,
        body: {} satisfies IHrmPlatformActivityLogChange.IRequest,
      },
    );
  typia.assert(emptyFilterResponse);
  TestValidator.predicate(
    "empty filter returns valid pagination",
    emptyFilterResponse.pagination.current >= 1,
  );
  // 7. Test with specific field_name filter
  const fieldNameFilterResponse =
    await api.functional.hrmPlatform.member.activity_logs.changes.index(
      memberConnection,
      {
        activityLogId: emptyFilterActivityLogId,
        body: {
          field_name: "status",
          page: 1,
          limit: 20,
        } satisfies IHrmPlatformActivityLogChange.IRequest,
      },
    );
  typia.assert(fieldNameFilterResponse);
  TestValidator.equals(
    "field name filter current page is 1",
    fieldNameFilterResponse.pagination.current,
    1,
  );
  // 8. Test with field_type filter
  const fieldTypeFilterResponse =
    await api.functional.hrmPlatform.member.activity_logs.changes.index(
      memberConnection,
      {
        activityLogId: emptyFilterActivityLogId,
        body: {
          field_type: "string",
          page: 1,
          limit: 20,
        } satisfies IHrmPlatformActivityLogChange.IRequest,
      },
    );
  typia.assert(fieldTypeFilterResponse);
  TestValidator.equals(
    "field type filter current page is 1",
    fieldTypeFilterResponse.pagination.current,
    1,
  );
  // 9. Test with old_value and new_value filters
  const valueFilterResponse =
    await api.functional.hrmPlatform.member.activity_logs.changes.index(
      memberConnection,
      {
        activityLogId: emptyFilterActivityLogId,
        body: {
          new_value: "active",
          page: 1,
          limit: 20,
        } satisfies IHrmPlatformActivityLogChange.IRequest,
      },
    );
  typia.assert(valueFilterResponse);
  TestValidator.equals(
    "value filter current page is 1",
    valueFilterResponse.pagination.current,
    1,
  );
  // 10. Verify sorting order (created_at descending)
  const sortTestActivityLogId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const sortTestResponse =
    await api.functional.hrmPlatform.member.activity_logs.changes.index(
      memberConnection,
      {
        activityLogId: sortTestActivityLogId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformActivityLogChange.IRequest,
      },
    );
  typia.assert(sortTestResponse);
  // Verify that if there are multiple changes, they are sorted by created_at descending
  if (sortTestResponse.data.length > 1) {
    for (let i = 1; i < sortTestResponse.data.length; i++) {
      TestValidator.predicate(
        `changes sorted by created_at descending at index ${i}`,
        new Date(sortTestResponse.data[i - 1].created_at) >=
          new Date(sortTestResponse.data[i].created_at),
      );
    }
  }
  // 11. Validate activityLog reference exists for each change
  for (const change of sortTestResponse.data) {
    typia.assert(change);
    TestValidator.predicate(
      "change has activityLog reference",
      change.activityLog !== null,
    );
  }
  // 12. Test pagination metadata consistency
  const paginationTestResponse =
    await api.functional.hrmPlatform.member.activity_logs.changes.index(
      memberConnection,
      {
        activityLogId: sortTestActivityLogId,
        body: {
          page: 1,
          limit: 5,
        } satisfies IHrmPlatformActivityLogChange.IRequest,
      },
    );
  typia.assert(paginationTestResponse);
  TestValidator.equals(
    "pagination current matches request",
    paginationTestResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    paginationTestResponse.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    paginationTestResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    paginationTestResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    paginationTestResponse.data.length <= 5,
  );
}
