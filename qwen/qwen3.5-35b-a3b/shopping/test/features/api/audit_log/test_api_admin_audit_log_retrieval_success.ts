import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_audit_log_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "http://localhost/admin/join",
      referrer: "http://localhost/admin",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Retrieve audit log entry
  const logId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const log = await api.functional.ecommerceMall.admin.audit_logs.at(
    adminConnection,
    { logId },
  );
  typia.assert(log);
  // 3. Validate audit log response structure
  TestValidator.notEquals("log id exists", log.id, null);
  TestValidator.notEquals("log admin exists", log.admin, null);
  TestValidator.notEquals("log action_type exists", log.action_type, null);
  TestValidator.notEquals(
    "log target_entity_type exists",
    log.target_entity_type,
    null,
  );
  TestValidator.notEquals("log created_at exists", log.created_at, null);
  TestValidator.notEquals("log updated_at exists", log.updated_at, null);
  // 4. Validate admin summary
  TestValidator.notEquals("admin summary id exists", log.admin.id, null);
  TestValidator.notEquals("admin summary email exists", log.admin.email, null);
  TestValidator.notEquals(
    "admin summary is_banned exists",
    log.admin.is_banned,
    null,
  );
  TestValidator.notEquals(
    "admin summary created_at exists",
    log.admin.created_at,
    null,
  );
  TestValidator.notEquals(
    "admin summary updated_at exists",
    log.admin.updated_at,
    null,
  );
  // 5. Validate JSON fields are objects or null
  TestValidator.predicate(
    "changes is object or null",
    log.changes === null || typeof log.changes === "object",
  );
  TestValidator.predicate(
    "previous_values is object or null",
    log.previous_values === null || typeof log.previous_values === "object",
  );
  TestValidator.predicate(
    "new_values is object or null",
    log.new_values === null || typeof log.new_values === "object",
  );
  // 6. Validate UUID field formats
  const validUuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  TestValidator.predicate(
    "log id is valid UUID",
    validUuidPattern.test(log.id),
  );
  if (log.admin.id) {
    TestValidator.predicate(
      "admin id is valid UUID",
      validUuidPattern.test(log.admin.id),
    );
  }
  if (log.request_id) {
    TestValidator.predicate(
      "request_id is valid UUID",
      validUuidPattern.test(log.request_id),
    );
  }
  if (log.target_entity_id) {
    TestValidator.predicate(
      "target_entity_id is valid UUID",
      validUuidPattern.test(log.target_entity_id),
    );
  }
  // 7. Validate datetime formats
  const validDateTimePattern =
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i;
  TestValidator.predicate(
    "created_at is valid ISO 8601",
    validDateTimePattern.test(log.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601",
    validDateTimePattern.test(log.updated_at),
  );
  TestValidator.predicate(
    "admin created_at is valid ISO 8601",
    validDateTimePattern.test(log.admin.created_at),
  );
  TestValidator.predicate(
    "admin updated_at is valid ISO 8601",
    validDateTimePattern.test(log.admin.updated_at),
  );
}
