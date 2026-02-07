import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_admin_request_hard_delete(
  connection: api.IConnection,
): Promise<void> {
  // This test validates the admin request hard deletion endpoint
  // Since we cannot create an administrator request through available APIs,
  // we test the erase function with a valid UUID format request ID
  const requestId = typia.random<string & tags.Format<"uuid">>();
  // Test hard deletion with a valid UUID
  await api.functional.discussionBoard.admin.requests.erase(connection, {
    requestId,
  });
}
