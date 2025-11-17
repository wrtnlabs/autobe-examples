import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function test_api_user_registration_duplicate_username(
  connection: api.IConnection,
) {
  // First, create an initial user to establish the duplicate username condition
  const initialUser = await api.functional.auth.user.join(connection, {
    body: {
      email: "initial@example.com",
      password: "password123",
      username: "duplicate_test_user",
    } satisfies ICommunityForumCommunityUser.IJoin,
  });
  typia.assert(initialUser);

  // Verify the initial user was created successfully
  TestValidator.equals(
    "initial user email",
    initialUser.email,
    "initial@example.com",
  );
  TestValidator.equals(
    "initial user username",
    initialUser.username,
    "duplicate_test_user",
  );

  // Now attempt to register a second user with the same username
  // This should fail with an appropriate error
  await TestValidator.error(
    "duplicate username should be rejected",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: {
          email: "duplicate@example.com", // Different email
          password: "password456", // Different password
          username: "duplicate_test_user", // Same username - should cause failure
        } satisfies ICommunityForumCommunityUser.IJoin,
      });
    },
  );
}
