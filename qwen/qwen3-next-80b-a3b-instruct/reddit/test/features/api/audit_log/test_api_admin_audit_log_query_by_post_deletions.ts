import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_audit_log_query_by_post_deletions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin user registration
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "securePassword123!",
    } satisfies ICommunityAdmin.IJoin,
  });
  // 2. Query all audit logs using the API endpoint
  // The IRequest type is empty per provided DTO definitions - no filters possible
  const queryResponse = await api.functional.community.admin.audit_logs.patch(
    adminConnection,
    {
      body: {} satisfies ICommunityAuditLog.IRequest,
    },
  );
  typia.assert(queryResponse);
  // 3. Validate response structure (CORE VALIDATION)
  TestValidator.equals(
    "response has correct pagination structure",
    Array.isArray(queryResponse.pagination),
    true,
  );
  TestValidator.equals(
    "response has correct data array structure",
    Array.isArray(queryResponse.data),
    true,
  );
  // Validate pagination properties
  TestValidator.predicate(
    "pagination current is positive",
    queryResponse.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    queryResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    queryResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    queryResponse.pagination.pages >= 0,
  );
  // Validate each audit log in the data array has correct structure
  for (const log of queryResponse.data) {
    TestValidator.equals(
      "audit log has proper id format",
      typeof log.id === "string",
      true,
    );
    TestValidator.equals(
      "audit log has proper moderator_id format",
      typeof log.moderator_id === "string",
      true,
    );
    TestValidator.equals(
      "audit log has proper target_id format",
      typeof log.target_id === "string",
      true,
    );
    TestValidator.equals(
      "audit log has correct target_type",
      ["post", "comment", "report"].includes(log.target_type),
      true,
    );
    TestValidator.equals(
      "audit log has correct action_type",
      ["delete_post", "ban_user", "approve_report", "dismiss_report"].includes(
        log.action_type,
      ),
      true,
    );
    TestValidator.equals(
      "audit log has proper created_at format",
      typeof log.created_at === "string",
      true,
    );
    // Validate description is optional string or undefined
    if (log.description !== undefined) {
      TestValidator.equals(
        "audit log description is string",
        typeof log.description === "string",
        true,
      );
    }
  }
  // Validate logs are ordered by created_at descending (most recent first)
  // This is specified in the scenario and should be the server default order
  for (let i = 0; i < queryResponse.data.length - 1; i++) {
    const currentLogDate = new Date(queryResponse.data[i].created_at);
    const nextLogDate = new Date(queryResponse.data[i + 1].created_at);
    TestValidator.predicate(
      "logs ordered by created_at descending",
      currentLogDate >= nextLogDate,
    );
  }
}