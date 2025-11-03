import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAdminSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdminSuspension";
import type { IShoppingAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAppeal";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingBusinessPolicy";
import type { IShoppingPolicyViolation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingPolicyViolation";

/**
 * Validate that a newly registered admin can access full detail of an appeal by
 * its unique ID.
 *
 * 1. Register a new admin with a unique email and compliant password.
 * 2. Fetch a random appeal detail with admin context.
 * 3. Assert the response contains all core appeal information (status, actors,
 *    decision, audit, attachments, related policy/suspension where present).
 * 4. Confirm audit and compliance details returned (no PII redacted when admin).
 * 5. Test error handling retrieving a non-existent appealId (should raise error).
 */
export async function test_api_appeal_detail_admin_access_new_admin_context(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: RandomGenerator.name(2),
      role: "support",
      status: "active",
    } satisfies IShoppingAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Fetch detail for a random (potentially existing) appeal as admin
  const testAppealId = typia.random<string & tags.Format<"uuid">>();
  const appeal = await api.functional.shopping.admin.appeals.at(connection, {
    appealId: testAppealId,
  });
  typia.assert(appeal);

  // 3. Core content assertions on appeal object
  TestValidator.predicate(
    "status is present",
    typeof appeal.status === "string" && appeal.status.length > 0,
  );
  TestValidator.predicate(
    "type is present",
    typeof appeal.type === "string" && appeal.type.length > 0,
  );
  TestValidator.predicate(
    "filer actor uuid is present",
    typeof appeal.filer_actor_id === "string" &&
      appeal.filer_actor_id.length > 0,
  );
  TestValidator.predicate(
    "appeal created_at is iso date",
    typeof appeal.created_at === "string" && appeal.created_at.includes("T"),
  );
  TestValidator.predicate(
    "has audit trail/history if present",
    !appeal.audit_history || Array.isArray(appeal.audit_history),
  );
  TestValidator.predicate(
    "attachments array valid if present",
    !appeal.attachments || Array.isArray(appeal.attachments),
  );
  if (appeal.audit_history && appeal.audit_history.length > 0) {
    TestValidator.predicate(
      "first audit event has timestamp",
      !!appeal.audit_history[0].timestamp &&
        typeof appeal.audit_history[0].timestamp === "string",
    );
  }

  // 4. No redacted fields for admin context (PII visible as spec allows)
  TestValidator.predicate(
    "admin can view filer_actor_id",
    typeof appeal.filer_actor_id === "string" &&
      appeal.filer_actor_id.length > 0,
  );

  // 5. Negative test — access non-existent appealId (should error)
  await TestValidator.error(
    "reading non-existent appeal should fail",
    async () => {
      await api.functional.shopping.admin.appeals.at(connection, {
        appealId: typia.random<string & tags.Format<"uuid">>(), // high chance not to exist
      });
    },
  );
}
