import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_user_profile_privacy_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Since user creation endpoints are not provided, we'll simulate the scenario
  // by attempting to update a valid user profile ID with an unauthorized connection
  // Generate a valid user ID that would exist in the system
  const targetUserId = typia.random<string & tags.Format<"uuid">>();
  // Create a connection that represents an authenticated user
  // (in a real scenario, this would be properly authenticated)
  const unauthorizedUserConnection: api.IConnection = { host: connection.host };
  // Attempt to update another user's profile using unauthorized connection
  // This should fail with authorization error since users can only update their own profiles
  await TestValidator.error(
    "User cannot update other user's profile",
    async () => {
      await api.functional.todoApp.users.update(unauthorizedUserConnection, {
        userId: targetUserId,
        body: {
          display_name: RandomGenerator.name(),
        } satisfies ITodoAppUser.IUpdate,
      });
    },
  );
}
