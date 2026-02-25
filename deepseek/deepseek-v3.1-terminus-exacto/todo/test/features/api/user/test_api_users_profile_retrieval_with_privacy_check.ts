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
 * Test user profile retrieval with privacy enforcement.
 * 1. Create a test user account via registration
 * 2. Authenticate the user to get valid token
 * 3. Retrieve the user's own profile using correct user ID
 * 4. Validate profile contains expected fields and excludes sensitive data
 * 5. Attempt to access another user's profile with invalid user ID to test privacy controls
 */
export async function test_api_users_profile_retrieval_with_privacy_check(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create user account
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(authorizedUser);
  // Step 2: Retrieve own profile with correct user ID
  const ownProfile = await api.functional.todoApp.users.at(userConnection, {
    userId: authorizedUser.id,
  });
  typia.assert(ownProfile);
  // Step 3: Validate profile contains expected fields
  TestValidator.equals(
    "profile should have id field",
    typeof ownProfile.id,
    "string",
  );
  TestValidator.equals(
    "profile should have email field",
    typeof ownProfile.email,
    "string",
  );
  TestValidator.equals(
    "profile should have display_name field",
    typeof ownProfile.display_name,
    "string",
  );
  TestValidator.equals(
    "profile should have created_at field",
    typeof ownProfile.created_at,
    "string",
  );
  TestValidator.equals(
    "profile should have updated_at field",
    typeof ownProfile.updated_at,
    "string",
  );
  // Step 4: Validate sensitive fields are excluded (profile response should not have password_hash or deleted_at)
  TestValidator.predicate(
    "profile should not contain password_hash field",
    () => !("password_hash" in ownProfile),
  );
  TestValidator.predicate(
    "profile should not contain deleted_at field",
    () => !("deleted_at" in ownProfile),
  );
  // Step 5: Test privacy controls - attempt to access another user's profile
  const randomUserId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should reject access to another user's profile",
    async () => {
      await api.functional.todoApp.users.at(userConnection, {
        userId: randomUserId,
      });
    },
  );
}
