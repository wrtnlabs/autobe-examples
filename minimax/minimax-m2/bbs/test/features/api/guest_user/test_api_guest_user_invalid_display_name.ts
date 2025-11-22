import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionGuestUser";

export async function test_api_guest_user_invalid_display_name(
  connection: api.IConnection,
) {
  // Test 1: Empty display name
  await TestValidator.error("empty display name should fail", async () => {
    await api.functional.auth.guestUser.join(connection, {
      body: {
        display_name: "",
        email: typia.random<string & tags.Format<"email">>(),
      } satisfies IEconPoliticalDiscussionGuestUser.ICreate,
    });
  });

  // Test 2: Too short display name (under 3 characters)
  await TestValidator.error("too short display name should fail", async () => {
    await api.functional.auth.guestUser.join(connection, {
      body: {
        display_name: "ab",
        email: typia.random<string & tags.Format<"email">>(),
      } satisfies IEconPoliticalDiscussionGuestUser.ICreate,
    });
  });

  // Test 3: Display name with prohibited characters (using special characters)
  await TestValidator.error(
    "display name with prohibited characters should fail",
    async () => {
      await api.functional.auth.guestUser.join(connection, {
        body: {
          display_name: "User@#$%",
          email: typia.random<string & tags.Format<"email">>(),
        } satisfies IEconPoliticalDiscussionGuestUser.ICreate,
      });
    },
  );

  // Test 4: Display name with only spaces
  await TestValidator.error(
    "display name with only spaces should fail",
    async () => {
      await api.functional.auth.guestUser.join(connection, {
        body: {
          display_name: "   ",
          email: typia.random<string & tags.Format<"email">>(),
        } satisfies IEconPoliticalDiscussionGuestUser.ICreate,
      });
    },
  );
}
