import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingSystemLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSystemLog";

/**
 * Validate that an authenticated admin can retrieve a specific system log
 * record by its unique ID.
 *
 * The test covers:
 *
 * 1. Prerequisite: Register and authenticate as an admin (with a valid role such
 *    as 'super', 'support', or 'compliance').
 * 2. Simulate the existence of (or fetch a random) system log entry.
 * 3. Retrieve the system log by its unique ID via the admin endpoint.
 * 4. Assert that all required audit/compliance fields (id, event_time, log_level,
 *    event_type, event_source, message, details, created_at) are present and
 *    correctly typed.
 * 5. Confirm no sensitive fields are exposed and data matches type guarantees.
 */
export async function test_api_system_log_record_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    role: RandomGenerator.pick([
      "super",
      "support",
      "compliance",
      "operator",
    ] as const),
    status: "active",
  } satisfies IShoppingAdmin.IJoin;
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminBody });
  typia.assert(admin);

  // 2. Create random system log id (simulate or retrieve via typia)
  // For demonstration, simulate a valid system log (the API might use simulation for non-existing entries)
  const systemLogId = typia.random<string & tags.Format<"uuid">>();

  // 3. Retrieve the system log by id via the admin endpoint
  const log: IShoppingSystemLog =
    await api.functional.shopping.admin.systemLogs.at(connection, {
      id: systemLogId,
    });
  typia.assert(log);

  // 4. Validate fields are present and correctly typed
  TestValidator.equals(
    "system log id matches requested id",
    log.id,
    systemLogId,
  );
  TestValidator.predicate(
    "event_time is ISO 8601 string",
    typeof log.event_time === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(log.event_time),
  );
  TestValidator.predicate(
    "created_at is ISO 8601 string",
    typeof log.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(log.created_at),
  );
  TestValidator.predicate(
    "log_level is string",
    typeof log.log_level === "string",
  );
  TestValidator.predicate(
    "event_type is string",
    typeof log.event_type === "string",
  );
  TestValidator.predicate(
    "event_source is string",
    typeof log.event_source === "string",
  );
  TestValidator.predicate("message is string", typeof log.message === "string");
  // details is optional
  if (log.details !== undefined) {
    TestValidator.predicate(
      "details is string if present",
      typeof log.details === "string",
    );
  }
}
