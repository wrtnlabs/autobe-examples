import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test filtering audit logs by specific actor types (user, admin, super_admin, system).
 * Verify that the filtering correctly isolates audit entries for each actor type
 * and returns accurate counts. Test individual actor type filtering and ensure
 * statistical calculations are accurate.
 */
export async function test_api_audit_logs_filter_by_actor_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Generate date range (past 30 days to current time)
  const endDate = new Date().toISOString();
  const startDate = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  // 3. Test individual actor types
  const actorTypes = ["user", "admin", "super_admin", "system"] as const;
  for (const actorType of actorTypes) {
    const request = {
      actor_type: actorType,
      start_date: startDate,
      end_date: endDate,
      page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 10 satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
    } satisfies IDiscussionBoardAuditLog.IRequest;
    const response =
      await api.functional.discussionBoard.superAdmin.audit_logs.index(
        superAdminConnection,
        { body: request },
      );
    typia.assert(response);
    // Validate that all returned entries match the requested actor type
    for (const entry of response.data) {
      TestValidator.equals(
        `actor type should be ${actorType}`,
        entry.actorType,
        actorType,
      );
    }
    // Validate statistical calculations
    for (const entry of response.data) {
      TestValidator.predicate(
        `total count should be non-negative for ${actorType}`,
        entry.totalCount >= 0,
      );
      TestValidator.predicate(
        `success count should be non-negative for ${actorType}`,
        entry.successCount >= 0,
      );
      TestValidator.predicate(
        `failure count should be non-negative for ${actorType}`,
        entry.failureCount >= 0,
      );
      TestValidator.predicate(
        `success rate should be between 0-100 for ${actorType}`,
        entry.successRate >= 0 && entry.successRate <= 100,
      );
      // Only validate sum if totalCount > 0
      if (entry.totalCount > 0) {
        TestValidator.equals(
          `total count should equal success + failure for ${actorType}`,
          entry.totalCount,
          entry.successCount + entry.failureCount,
        );
      }
    }
  }
  // 4. Test with null actor_type (should return all actor types)
  const allActorsRequest = {
    actor_type: null,
    start_date: startDate,
    end_date: endDate,
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IDiscussionBoardAuditLog.IRequest;
  const allActorsResponse =
    await api.functional.discussionBoard.superAdmin.audit_logs.index(
      superAdminConnection,
      { body: allActorsRequest },
    );
  typia.assert(allActorsResponse);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination current page should be 1",
    allActorsResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    allActorsResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    allActorsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    allActorsResponse.pagination.pages >= 0,
  );
  // 5. Test with undefined actor_type (should behave same as null)
  const undefinedActorsRequest = {
    actor_type: undefined,
    start_date: startDate,
    end_date: endDate,
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IDiscussionBoardAuditLog.IRequest;
  const undefinedActorsResponse =
    await api.functional.discussionBoard.superAdmin.audit_logs.index(
      superAdminConnection,
      { body: undefinedActorsRequest },
    );
  typia.assert(undefinedActorsResponse);
}
