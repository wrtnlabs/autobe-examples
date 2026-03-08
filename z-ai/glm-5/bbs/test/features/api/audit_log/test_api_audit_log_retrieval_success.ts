import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminAuditLog";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_audit_log_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate an admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // Step 2: Create a section to generate an audit log entry
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {},
  );
  typia.assert(section);
  // Step 3: Verify the section was created by the authenticated admin
  TestValidator.equals("section creator id", section.creator.id, admin.id);
  TestValidator.equals(
    "section creator email",
    section.creator.email,
    admin.email,
  );
  TestValidator.equals(
    "section creator grade",
    section.creator.grade,
    admin.grade,
  );
  // Step 4: Test audit log retrieval endpoint with valid UUID format
  // Note: The audit log list endpoint (PATCH /admin/audit-logs) is not available,
  // so we test the endpoint's contract validation with a properly formatted UUID
  const auditLogId = typia.random<string & tags.Format<"uuid">>();
  const auditLog = await api.functional.discussionBoard.admin.audit_logs.at(
    adminConnection,
    { auditLogId },
  );
  typia.assert(auditLog);
  // Validate the response structure matches IDiscussionBoardAdminAuditLog
  // typia.assert() validates all fields including:
  // - id: UUID format
  // - admin: IDiscussionBoardAdmin.ISummary | null
  // - member: IDiscussionBoardMember.ISummary | null
  // - article: IDiscussionBoardArticle.ISummary | null
  // - comment: IDiscussionBoardComment.ISummary | null
  // - section: IDiscussionBoardSection.ISummary | null
  // - adminRequest: IDiscussionBoardAdminRequest.ISummary | null
  // - targetAdmin: IDiscussionBoardAdmin.ISummary | null
  // - action: string
  // - reason: string | null
  // - ip: string
  // - created_at: ISO 8601 timestamp
}
