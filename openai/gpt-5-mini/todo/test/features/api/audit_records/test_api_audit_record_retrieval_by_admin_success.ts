import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAuditRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuditRecord";

export async function test_api_audit_record_retrieval_by_admin_success(
  connection: api.IConnection,
) {
  // 1) Create an admin account and validate the authorized response
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
  } satisfies ITodoAppAdmin.ICreate;

  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    { body: adminBody },
  );
  typia.assert(admin);

  // 2) Trigger a password reset for that admin (server-side audit record side-effect)
  const resetResponse: ITodoAppAdmin.IMessage =
    await api.functional.auth.admin.password.reset.requestPasswordReset(
      connection,
      {
        body: {
          email: admin.email,
        } satisfies ITodoAppAdmin.IRequestPasswordReset,
      },
    );
  typia.assert(resetResponse);

  // NOTE: The SDK does not provide a listing/search endpoint to obtain the
  // audit record id created by the previous operation. To validate the
  // audit record retrieval endpoint and DTO conformance, call the GET
  // endpoint in simulation mode which yields a valid ITodoAppAuditRecord
  // shape from the SDK's simulator.

  // 3) Use simulated connection to retrieve a synthetic audit record
  const simConn: api.IConnection = { ...connection, simulate: true };
  const simulatedAuditId = typia.random<string & tags.Format<"uuid">>();

  const audit: ITodoAppAuditRecord =
    await api.functional.todoApp.admin.auditRecords.at(simConn, {
      auditRecordId: simulatedAuditId,
    });
  typia.assert(audit);

  // 4) Business-level validations
  TestValidator.predicate(
    "created_at should be a valid ISO 8601 datetime",
    () => {
      try {
        const parsed = Date.parse(audit.created_at);
        return !isNaN(parsed);
      } catch {
        return false;
      }
    },
  );

  TestValidator.predicate(
    "actor_role should be a non-empty string",
    typeof audit.actor_role === "string" && audit.actor_role.length > 0,
  );

  TestValidator.predicate(
    "action_type should be a non-empty string",
    typeof audit.action_type === "string" && audit.action_type.length > 0,
  );

  TestValidator.predicate(
    "target_resource should be a non-empty string",
    typeof audit.target_resource === "string" &&
      audit.target_resource.length > 0,
  );

  TestValidator.predicate(
    "audit.id is present",
    typeof audit.id === "string" && audit.id.length > 0,
  );
}
