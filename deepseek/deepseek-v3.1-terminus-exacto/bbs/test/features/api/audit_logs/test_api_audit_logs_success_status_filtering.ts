import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_audit_logs_success_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test filtering by success=true
  const successRequest: IDiscussionBoardAuditLog.IRequest = {
    success: true,
    start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date().toISOString(),
    time_bucket: "daily" as const,
    page: 1,
    limit: 10,
  };
  const successResponse =
    await api.functional.discussionBoard.admin.audit_logs.index(
      adminConnection,
      { body: successRequest },
    );
  typia.assert(successResponse);
  // Test filtering by success=false
  const failureRequest: IDiscussionBoardAuditLog.IRequest = {
    success: false,
    start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date().toISOString(),
    time_bucket: "daily" as const,
    page: 1,
    limit: 10,
  };
  const failureResponse =
    await api.functional.discussionBoard.admin.audit_logs.index(
      adminConnection,
      { body: failureRequest },
    );
  typia.assert(failureResponse);
  // Validate pagination structure
  TestValidator.equals(
    "pagination structure",
    typeof successResponse.pagination,
    "object",
  );
  TestValidator.equals(
    "pagination structure",
    typeof failureResponse.pagination,
    "object",
  );
  // Validate data array structure
  TestValidator.predicate("data is array", Array.isArray(successResponse.data));
  TestValidator.predicate("data is array", Array.isArray(failureResponse.data));
  // Validate individual audit log summary structure and mathematical correctness
  const validateAuditLogSummary = (
    summary: IDiscussionBoardAuditLog.ISummary,
    context: string,
  ) => {
    TestValidator.equals(
      `${context} timeBucket format`,
      typeof summary.timeBucket,
      "string",
    );
    TestValidator.predicate(
      `${context} actorType valid`,
      ["user", "admin", "super_admin", "system"].includes(summary.actorType),
    );
    TestValidator.equals(
      `${context} actionType format`,
      typeof summary.actionType,
      "string",
    );
    TestValidator.predicate(
      `${context} totalCount non-negative`,
      summary.totalCount >= 0,
    );
    TestValidator.predicate(
      `${context} successCount non-negative`,
      summary.successCount >= 0,
    );
    TestValidator.predicate(
      `${context} failureCount non-negative`,
      summary.failureCount >= 0,
    );
    TestValidator.predicate(
      `${context} successRate in range`,
      summary.successRate >= 0 && summary.successRate <= 100,
    );
    // Validate mathematical correctness of success rate calculation
    if (summary.totalCount > 0) {
      const expectedSuccessRate =
        (summary.successCount / summary.totalCount) * 100;
      TestValidator.equals(
        `${context} success rate calculation`,
        summary.successRate,
        expectedSuccessRate,
      );
    } else {
      TestValidator.equals(
        `${context} zero total count success rate`,
        summary.successRate,
        0,
      );
    }
    // Validate total count equals success + failure counts
    TestValidator.equals(
      `${context} total count consistency`,
      summary.totalCount,
      summary.successCount + summary.failureCount,
    );
  };
  if (successResponse.data.length > 0) {
    validateAuditLogSummary(successResponse.data[0], "success filter");
  }
  if (failureResponse.data.length > 0) {
    validateAuditLogSummary(failureResponse.data[0], "failure filter");
  }
}
