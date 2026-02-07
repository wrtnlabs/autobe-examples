import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test profile update with various display name edge cases.
 * Create a user account via join endpoint. Test updating with minimum valid display name (1 character),
 * maximum valid display name (255 characters), and typical display names with spaces and special characters.
 * Verify all updates succeed and return correct profile information. Also test that the email field
 * remains immutable and cannot be changed through this endpoint.
 */
export async function test_api_user_profile_update_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection via join
  const userConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(joinResult);
  // Test minimum display name (1 character)
  const minDisplayName = "A";
  const minUpdateResult = await api.functional.todoApp.user.profile.update(
    userConnection,
    {
      body: {
        display_name: minDisplayName,
      } satisfies ITodoAppUser.IUpdate,
    },
  );
  typia.assert(minUpdateResult);
  TestValidator.equals(
    "minimum display name update",
    minUpdateResult.display_name,
    minDisplayName,
  );
  TestValidator.equals(
    "email remains unchanged",
    minUpdateResult.email,
    joinResult.email,
  );
  // Test maximum display name (255 characters)
  const maxDisplayName = RandomGenerator.alphabets(255);
  const maxUpdateResult = await api.functional.todoApp.user.profile.update(
    userConnection,
    {
      body: {
        display_name: maxDisplayName,
      } satisfies ITodoAppUser.IUpdate,
    },
  );
  typia.assert(maxUpdateResult);
  TestValidator.equals(
    "maximum display name update",
    maxUpdateResult.display_name,
    maxDisplayName,
  );
  TestValidator.equals(
    "email remains unchanged",
    maxUpdateResult.email,
    joinResult.email,
  );
  // Test display name with spaces
  const spacedDisplayName = "John Doe Smith";
  const spacedUpdateResult = await api.functional.todoApp.user.profile.update(
    userConnection,
    {
      body: {
        display_name: spacedDisplayName,
      } satisfies ITodoAppUser.IUpdate,
    },
  );
  typia.assert(spacedUpdateResult);
  TestValidator.equals(
    "spaced display name update",
    spacedUpdateResult.display_name,
    spacedDisplayName,
  );
  TestValidator.equals(
    "email remains unchanged",
    spacedUpdateResult.email,
    joinResult.email,
  );
  // Test display name with special characters
  const specialDisplayName = "User_123-Name@Example.com";
  const specialUpdateResult = await api.functional.todoApp.user.profile.update(
    userConnection,
    {
      body: {
        display_name: specialDisplayName,
      } satisfies ITodoAppUser.IUpdate,
    },
  );
  typia.assert(specialUpdateResult);
  TestValidator.equals(
    "special character display name update",
    specialUpdateResult.display_name,
    specialDisplayName,
  );
  TestValidator.equals(
    "email remains unchanged",
    specialUpdateResult.email,
    joinResult.email,
  );
  // Verify updated_at timestamp changes
  TestValidator.notEquals(
    "updated_at should change after profile update",
    joinResult.updated_at,
    specialUpdateResult.updated_at,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    joinResult.created_at,
    specialUpdateResult.created_at,
  );
}
