import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSystemAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystemAuditLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSystemAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_audit_logs_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create an administrator account for testing
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234" satisfies string & tags.Format<"password">,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Execute: Retrieve audit logs with default parameters
  const output = await api.functional.shoppingMall.admin.audit_logs.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSystemAuditLog.IRequest,
    },
  );
  // Validate response structure
  typia.assert(output);
  // Validate pagination metadata
  TestValidator.equals("has pagination", output.pagination !== undefined, true);
  TestValidator.predicate(
    "current page is valid",
    output.pagination.current >= 0,
  );
  TestValidator.predicate("limit is valid", output.pagination.limit >= 0);
  TestValidator.predicate(
    "records count is valid",
    output.pagination.records >= 0,
  );
  TestValidator.predicate("pages count is valid", output.pagination.pages >= 0);
  // Validate audit log entries structure
  for (const log of output.data) {
    TestValidator.equals("id exists", log.id !== undefined, true);
    TestValidator.predicate(
      "id is uuid format",
      /^[0-9a-f-]{36}$/i.test(log.id),
    );
    TestValidator.equals(
      "actor_type exists",
      log.actor_type !== undefined,
      true,
    );
    TestValidator.equals("actor_id exists", log.actor_id !== undefined, true);
    TestValidator.equals(
      "operation_type exists",
      log.operation_type !== undefined,
      true,
    );
    TestValidator.equals(
      "entity_type exists",
      log.entity_type !== undefined,
      true,
    );
    TestValidator.equals("entity_id exists", log.entity_id !== undefined, true);
    TestValidator.equals(
      "ip_address exists",
      log.ip_address !== undefined,
      true,
    );
    TestValidator.equals(
      "created_at exists",
      log.created_at !== undefined,
      true,
    );
    TestValidator.equals(
      "updated_at exists",
      log.updated_at !== undefined,
      true,
    );
  }
}
