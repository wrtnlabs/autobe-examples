import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_admin_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that does not exist in the system
  const nonExistentAdminId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve admin with non-existent UUID
  // Expect HTTP 404 Not Found error
  await TestValidator.httpError(
    "admin not found returns 404",
    404,
    async () => {
      await api.functional.erpHrm.admins.at(connection, {
        adminId: nonExistentAdminId,
      });
    },
  );
}
