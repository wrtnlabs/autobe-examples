import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_user_profile_empty_display_name_handling(
  connection: api.IConnection,
): Promise<void> {
  // Scenario note: Need to simulate user creation first since no utility functions provided.
  // We'll assume there's a way to create a test user via API.
  // For now, create a user connection with authentication simulated.
  const userConnection: api.IConnection = { host: connection.host };
  // In real scenario, we would:
  // 1. Create user via registration endpoint
  // 2. Login to get authenticated connection
  // Since no endpoints provided, simulate with random UUID
  const userId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Test valid boundary cases
  // Test 1: Minimum length (1 character)
  const minLengthDisplayName = RandomGenerator.alphabets(1);
  const update1 = await api.functional.todoApp.users.update(userConnection, {
    userId,
    body: { display_name: minLengthDisplayName } satisfies ITodoAppUser.IUpdate,
  });
  typia.assert(update1);
  TestValidator.equals(
    "display name with min length (1) should be accepted",
    update1.display_name,
    minLengthDisplayName,
  );
  // Test 2: Maximum length (50 characters)
  const maxLengthDisplayName = RandomGenerator.alphabets(50);
  const update2 = await api.functional.todoApp.users.update(userConnection, {
    userId,
    body: { display_name: maxLengthDisplayName } satisfies ITodoAppUser.IUpdate,
  });
  typia.assert(update2);
  TestValidator.equals(
    "display name with max length (50) should be accepted",
    update2.display_name,
    maxLengthDisplayName,
  );
  // Test 3: Normal length (random between 5 and 20)
  const normalLength = RandomGenerator.pick([5, 10, 15, 20]);
  const normalDisplayName = RandomGenerator.alphabets(normalLength);
  const update3 = await api.functional.todoApp.users.update(userConnection, {
    userId,
    body: { display_name: normalDisplayName } satisfies ITodoAppUser.IUpdate,
  });
  typia.assert(update3);
  TestValidator.equals(
    "normal length display name should be accepted",
    update3.display_name,
    normalDisplayName,
  );
  // Test invalid case: empty string (length 0) - violates minLength<1> business rule
  await TestValidator.error(
    "empty display name (length 0) should be rejected",
    async () => {
      await api.functional.todoApp.users.update(userConnection, {
        userId,
        // Empty string is valid string type but violates minLength constraint
        body: { display_name: "" } satisfies ITodoAppUser.IUpdate,
      });
    },
  );
  // Test null display_name - type allows null, but server may reject based on business rules
  // According to scenario, null should be rejected with validation error
  await TestValidator.error(
    "null display name should be rejected",
    async () => {
      await api.functional.todoApp.users.update(userConnection, {
        userId,
        body: { display_name: null } satisfies ITodoAppUser.IUpdate,
      });
    },
  );
}
