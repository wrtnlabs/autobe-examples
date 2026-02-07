import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppSystemAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppSystemAudit";
import type { ITodoAppSystemAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemAudit";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_system_audit_comprehensive_search(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Test the system audit comprehensive search endpoint with empty request body
  const response = await api.functional.todoApp.system_audits.index(
    adminConnection,
    {
      body: {},
    },
  );
  // Validate complete response structure using typia.assert() which validates
  // all fields including pagination, data array, and all audit summary objects
  typia.assert(response);
}
