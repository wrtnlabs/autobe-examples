import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_profile_unauthenticated_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare an unauthenticated connection (no auth headers)
  const unauthorizedConnection: api.IConnection = {
    host: connection.host,
  };
  // 2. Create a valid request body for profile update
  const body: ITodoAppMember.IUpdate = {
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppMember.IUpdate;
  // 3. Attempt to update profile without authentication
  await TestValidator.httpError(
    "unauthenticated profile update should return 401",
    401,
    async () =>
      await api.functional.todoApp.members.update(unauthorizedConnection, {
        body,
      }),
  );
}
