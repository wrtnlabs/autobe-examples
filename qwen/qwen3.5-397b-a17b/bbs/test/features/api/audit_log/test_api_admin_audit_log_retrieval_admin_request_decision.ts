import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminAuditLog";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_admin_requests_create } from "../../../generate/generate_random_discussion_board_member_admin_requests_create";
import { prepare_random_discussion_board_admin_request } from "../../../prepare/prepare_random_discussion_board_admin_request";

/**
 * Test retrieving an audit log entry for administrator request approval decision.
 *
 * This test validates the complete audit trail workflow for administrator privilege
 * escalation:
 * 1. Super administrator creates account
 * 2. Member registers and submits admin application request
 * 3. Super administrator approves the request (generates audit log)
 * 4. Retrieve and validate the audit log entry contains all required fields
 *
 * @param connection Base connection for the test
 */
export async function test_api_admin_audit_log_retrieval_admin_request_decision(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
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
  TestValidator.equals("admin grade", adminAuth.grade, "super");
  // 2. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 3. Member submits administrator application request
  const adminRequest =
    await generate_random_discussion_board_member_admin_requests_create(
      memberConnection,
      {
        body: {
          reason: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 10,
            sentenceMax: 15,
          }),
        } satisfies IDiscussionBoardAdminRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  TestValidator.equals(
    "request initial status",
    adminRequest.status,
    "pending",
  );
  TestValidator.predicate("no admin assigned yet", adminRequest.admin === null);
  // 4. Super administrator approves the request
  const approvedRequest =
    await api.functional.discussionBoard.admin.admin_requests.approve(
      adminConnection,
      {
        requestId: adminRequest.id,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals("request approved", approvedRequest.status, "approved");
  TestValidator.notEquals(
    "admin assigned after approval",
    approvedRequest.admin,
    null,
  );
  TestValidator.equals(
    "deciding admin is super admin",
    approvedRequest.admin!.grade,
    "super",
  );
  // 5. Retrieve audit log entry
  // Note: In simulation mode, a random UUID is used. In production, the audit log ID
  // would be obtained from a list endpoint or returned from the approval operation.
  const auditLog = await api.functional.discussionBoard.admin.audit_logs.at(
    adminConnection,
    {
      logId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(auditLog);
  // 6. Validate audit log contents
  TestValidator.equals(
    "admin performed action",
    auditLog.admin.id,
    approvedRequest.admin!.id,
  );
  TestValidator.equals("admin grade", auditLog.admin.grade, "super");
  TestValidator.equals(
    "action type",
    auditLog.action_type,
    "approve_admin_request",
  );
  TestValidator.equals(
    "target entity",
    auditLog.target_entity,
    "admin_request",
  );
  TestValidator.equals(
    "target id matches request",
    auditLog.target_id,
    adminRequest.id,
  );
  TestValidator.predicate("details JSON exists", auditLog.details !== null);
  TestValidator.predicate("ip address recorded", auditLog.ip.length > 0);
  TestValidator.predicate(
    "user agent recorded",
    auditLog.user_agent.length > 0,
  );
  TestValidator.predicate("timestamp exists", auditLog.created_at.length > 0);
}
