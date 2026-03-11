import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminAuditLog";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator audit logs retrieval with proper authentication.
 *
 * This test validates the primary success path for retrieving administrative audit logs:
 * 1. Registers and authenticates as an administrator
 * 2. Queries the audit log endpoint with no filter parameters
 * 3. Validates pagination metadata structure and values
 * 4. Validates audit log entries contain all required fields
 * 5. Verifies default sorting is by created_at descending (newest first)
 */
export async function test_api_admin_audit_logs_retrieval_with_admin_authentication(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Retrieve audit logs with no filter parameters (default pagination)
  const auditLogsResponse =
    await api.functional.discussionBoard.admin.audit_logs.index(
      adminConnection,
      {
        body: {} satisfies IDiscussionBoardAdminAuditLog.IRequest,
      },
    );
  typia.assert(auditLogsResponse);
  // 3. Validate pagination metadata
  const { pagination, data } = auditLogsResponse;
  TestValidator.predicate(
    "pagination current page is valid",
    pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    pagination.limit >= 1 && pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination pages calculation is correct",
    pagination.pages === Math.ceil(pagination.records / pagination.limit),
  );
  // 4. Validate audit log entries and sorting (if any exist)
  if (data.length > 0) {
    // 5. Verify sorting is by created_at descending (newest first)
    if (data.length > 1) {
      for (let i = 0; i < data.length - 1; i++) {
        const currentTime = new Date(data[i].created_at).getTime();
        const nextTime = new Date(data[i + 1].created_at).getTime();
        TestValidator.predicate(
          `log[${i}] should be newer than or equal to log[${i + 1}]`,
          currentTime >= nextTime,
        );
      }
    }
    // 6. Validate admin member is_admin flag is true (business logic for admin accounts)
    for (const log of data) {
      TestValidator.predicate(
        "audit log admin member should have is_admin flag",
        log.admin.member.is_admin === true,
      );
    }
  }
}
