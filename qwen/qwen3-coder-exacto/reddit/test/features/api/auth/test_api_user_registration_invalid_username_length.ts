import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function test_api_user_registration_invalid_username_length(
  connection: api.IConnection,
) {
  // Test case 1: Username too short (0 characters)
  await TestValidator.error("should reject empty username", async () => {
    await api.functional.auth.user.join(connection, {
      body: {
        email: "test@example.com",
        password: "password123",
        username: "",
      } satisfies ICommunityForumCommunityUser.IJoin,
    });
  });

  // Test case 2: Username too short (1 character)
  await TestValidator.error("should reject 1-character username", async () => {
    await api.functional.auth.user.join(connection, {
      body: {
        email: "test1@example.com",
        password: "password123",
        username: "a",
      } satisfies ICommunityForumCommunityUser.IJoin,
    });
  });

  // Test case 3: Username too short (2 characters)
  await TestValidator.error("should reject 2-character username", async () => {
    await api.functional.auth.user.join(connection, {
      body: {
        email: "test2@example.com",
        password: "password123",
        username: "ab",
      } satisfies ICommunityForumCommunityUser.IJoin,
    });
  });

  // Test case 4: Username too long (22 characters)
  await TestValidator.error("should reject 22-character username", async () => {
    await api.functional.auth.user.join(connection, {
      body: {
        email: "test3@example.com",
        password: "password123",
        username: "a".repeat(22),
      } satisfies ICommunityForumCommunityUser.IJoin,
    });
  });

  // Test case 5: Username too long (50 characters)
  await TestValidator.error("should reject 50-character username", async () => {
    await api.functional.auth.user.join(connection, {
      body: {
        email: "test4@example.com",
        password: "password123",
        username: "a".repeat(50),
      } satisfies ICommunityForumCommunityUser.IJoin,
    });
  });

  // Test case 6: Valid minimum length username (3 characters)
  const validMinUser = await api.functional.auth.user.join(connection, {
    body: {
      email: "validmin@example.com",
      password: "password123",
      username: "abc",
    } satisfies ICommunityForumCommunityUser.IJoin,
  });
  typia.assert(validMinUser);

  // Test case 7: Valid maximum length username (21 characters)
  const validMaxUser = await api.functional.auth.user.join(connection, {
    body: {
      email: "validmax@example.com",
      password: "password123",
      username: "a".repeat(21),
    } satisfies ICommunityForumCommunityUser.IJoin,
  });
  typia.assert(validMaxUser);
}
