import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneAdminAuditLog";
import type { IRedditCloneAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAdmin";
import type { IRedditCloneAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_audit_logs_retrieve_paginated(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that an authenticated admin can retrieve a paginated list of administrative audit log entries.
   * Verifies pagination metadata, audit log entry structure, and sorting order.
   */
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: null,
      avatar: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Retrieve audit logs with default pagination (limit not specified, should default to 20)
  const defaultPageResult =
    await api.functional.redditClone.admin.audit_logs.index(adminConnection, {
      body: {
        page: 1,
      } satisfies IRedditCloneAdminAuditLog.IRequest,
    });
  typia.assert(defaultPageResult);
  // 3. Validate default pagination metadata
  TestValidator.equals(
    "default page is 1",
    defaultPageResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit is 20",
    defaultPageResult.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "records count is non-negative",
    defaultPageResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    defaultPageResult.pagination.pages >= 0,
  );
  // 4. Test custom pagination with specific limit
  const customLimit = 10;
  const customPageResult =
    await api.functional.redditClone.admin.audit_logs.index(adminConnection, {
      body: {
        page: 1,
        limit: customLimit,
      } satisfies IRedditCloneAdminAuditLog.IRequest,
    });
  typia.assert(customPageResult);
  TestValidator.equals(
    "custom limit applied",
    customPageResult.pagination.limit,
    customLimit,
  );
  TestValidator.equals(
    "custom page is 1",
    customPageResult.pagination.current,
    1,
  );
  // 5. Test pagination with page 2 (if enough records exist)
  if (defaultPageResult.pagination.pages >= 2) {
    const page2Result = await api.functional.redditClone.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 20,
        } satisfies IRedditCloneAdminAuditLog.IRequest,
      },
    );
    typia.assert(page2Result);
    TestValidator.equals("page 2 current", page2Result.pagination.current, 2);
    TestValidator.equals("page 2 limit", page2Result.pagination.limit, 20);
    // Verify entries on page 2 are different from page 1 (if both have data)
    if (defaultPageResult.data.length > 0 && page2Result.data.length > 0) {
      const page1FirstId = defaultPageResult.data[0].id;
      const page2FirstId = page2Result.data[0].id;
      TestValidator.notEquals(
        "page 1 and page 2 have different entries",
        page1FirstId,
        page2FirstId,
      );
    }
  }
  // 6. Verify sorting order (most recent first) if multiple entries exist
  if (defaultPageResult.data.length >= 2) {
    const firstEntry = defaultPageResult.data[0];
    const secondEntry = defaultPageResult.data[1];
    // Parse dates and verify descending order
    const firstDate = new Date(firstEntry.created_at).getTime();
    const secondDate = new Date(secondEntry.created_at).getTime();
    TestValidator.predicate(
      "entries sorted by created_at descending",
      firstDate >= secondDate,
    );
  }
  // 7. Test filtering by action_type (if any action types exist in data)
  if (defaultPageResult.data.length > 0) {
    const sampleActionType = defaultPageResult.data[0].action_type;
    const filteredResult =
      await api.functional.redditClone.admin.audit_logs.index(adminConnection, {
        body: {
          page: 1,
          limit: 20,
          action_type: sampleActionType,
        } satisfies IRedditCloneAdminAuditLog.IRequest,
      });
    typia.assert(filteredResult);
    // Verify all returned entries match the filter
    const allMatch = filteredResult.data.every(
      (entry) => entry.action_type === sampleActionType,
    );
    TestValidator.predicate("filtered entries match action_type", allMatch);
  }
}
