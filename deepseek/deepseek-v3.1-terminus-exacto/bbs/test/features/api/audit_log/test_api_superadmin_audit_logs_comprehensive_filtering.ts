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

export async function test_api_superadmin_audit_logs_comprehensive_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test individual filter criteria
  const actorTypes = ["admin", "super_admin", "member", "system"] as const;
  for (const actorType of actorTypes) {
    const response =
      await api.functional.discussionBoard.superAdmin.audit_logs.index(
        superAdminConnection,
        {
          body: {
            actorType,
          } satisfies IDiscussionBoardAuditLog.IRequest,
        },
      );
    typia.assert(response);
    TestValidator.predicate(
      `response should have pagination metadata for actorType ${actorType}`,
      response.pagination !== undefined,
    );
  }
  // Test action type filtering
  const actionTypes = [
    "create_section",
    "delete_article",
    "ban_user",
    "approve_admin_request",
  ] as const;
  for (const actionType of actionTypes) {
    const response =
      await api.functional.discussionBoard.superAdmin.audit_logs.index(
        superAdminConnection,
        {
          body: {
            actionType,
          } satisfies IDiscussionBoardAuditLog.IRequest,
        },
      );
    typia.assert(response);
    TestValidator.predicate(
      `response should have pagination metadata for actionType ${actionType}`,
      response.pagination !== undefined,
    );
  }
  // Test target type filtering
  const targetTypes = [
    "section",
    "article",
    "comment",
    "user",
    "admin_request",
  ] as const;
  for (const targetType of targetTypes) {
    const response =
      await api.functional.discussionBoard.superAdmin.audit_logs.index(
        superAdminConnection,
        {
          body: {
            targetType,
          } satisfies IDiscussionBoardAuditLog.IRequest,
        },
      );
    typia.assert(response);
    TestValidator.predicate(
      `response should have pagination metadata for targetType ${targetType}`,
      response.pagination !== undefined,
    );
  }
  // Test date range filtering
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const responseWithDateRange =
    await api.functional.discussionBoard.superAdmin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          startDate: oneWeekAgo.toISOString(),
          endDate: now.toISOString(),
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(responseWithDateRange);
  TestValidator.predicate(
    "response should have pagination metadata for date range filter",
    responseWithDateRange.pagination !== undefined,
  );
  // Test IP address filtering
  const ipResponse =
    await api.functional.discussionBoard.superAdmin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          ipAddress: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(ipResponse);
  TestValidator.predicate(
    "response should have pagination metadata for IP address filter",
    ipResponse.pagination !== undefined,
  );
  // Test search text filtering
  const searchResponse =
    await api.functional.discussionBoard.superAdmin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          searchText: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(searchResponse);
  TestValidator.predicate(
    "response should have pagination metadata for search text filter",
    searchResponse.pagination !== undefined,
  );
  // Test pagination parameters
  const paginationResponse =
    await api.functional.discussionBoard.superAdmin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(paginationResponse);
  TestValidator.predicate(
    "response should have valid pagination metadata",
    paginationResponse.pagination.current > 0 &&
      paginationResponse.pagination.limit > 0 &&
      paginationResponse.pagination.records >= 0 &&
      paginationResponse.pagination.pages >= 0,
  );
  // Test complex filter combinations
  const complexResponse =
    await api.functional.discussionBoard.superAdmin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          actorType: RandomGenerator.pick(["admin", "super_admin"] as const),
          actionType: RandomGenerator.pick([
            "create_section",
            "delete_article",
          ] as const),
          targetType: RandomGenerator.pick(["section", "article"] as const),
          startDate: oneWeekAgo.toISOString(),
          endDate: now.toISOString(),
          searchText: RandomGenerator.paragraph({ sentences: 1 }),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(complexResponse);
  TestValidator.predicate(
    "response should have pagination metadata for complex filter combination",
    complexResponse.pagination !== undefined,
  );
  // Validate that results are sorted by created_at descending (only if data exists)
  if (complexResponse.data.length > 1) {
    for (let i = 1; i < complexResponse.data.length; i++) {
      const currentDate = new Date(complexResponse.data[i].created_at);
      const previousDate = new Date(complexResponse.data[i - 1].created_at);
      TestValidator.predicate(
        "audit logs should be sorted by created_at descending",
        currentDate <= previousDate,
      );
    }
  }
}
