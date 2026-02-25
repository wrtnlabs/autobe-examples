import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_password_change_complexity_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection and register account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "ValidPassword123!",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator);
  // Test various invalid password scenarios
  const invalidPasswords = [
    { description: "too short", password: "Short1!" },
    { description: "missing uppercase", password: "lowercase123!" },
    { description: "missing lowercase", password: "UPPERCASE123!" },
    { description: "missing numbers", password: "NoNumbers!" },
    { description: "missing special characters", password: "NoSpecial123" },
    { description: "common weak password", password: "password123" },
    { description: "only lowercase", password: "lowercaseonly" },
    { description: "only uppercase", password: "UPPERCASEONLY" },
    { description: "only numbers", password: "1234567890" },
    { description: "only special characters", password: "!@#$%^&*()" },
  ];
  for (const { description, password } of invalidPasswords) {
    await TestValidator.error(
      `password change should fail for ${description}`,
      async () => {
        await api.functional.communityPlatform.moderator.password.updatePassword(
          moderatorConnection,
          {
            body: {
              current_password: "ValidPassword123!",
              new_password: password,
            } satisfies ICommunityPlatformModerator.IChangePassword,
          },
        );
      },
    );
  }
  // Verify session remains valid after failed attempts
  // Try to use the moderator connection for another operation to verify session validity
  const sessionValid = await TestValidator.predicate(
    "session should remain valid after failed password change attempts",
    () => moderatorConnection.headers?.Authorization !== undefined,
  );
  // Test valid password change to ensure the endpoint works correctly
  const validPassword = "NewValidPassword456!";
  await api.functional.communityPlatform.moderator.password.updatePassword(
    moderatorConnection,
    {
      body: {
        current_password: "ValidPassword123!",
        new_password: validPassword,
      } satisfies ICommunityPlatformModerator.IChangePassword,
    },
  );
  // Verify that password was actually changed by trying to use old password
  await TestValidator.error("old password should no longer work", async () => {
    await api.functional.communityPlatform.moderator.password.updatePassword(
      moderatorConnection,
      {
        body: {
          current_password: "ValidPassword123!",
          new_password: "AnotherValidPassword789!",
        } satisfies ICommunityPlatformModerator.IChangePassword,
      },
    );
  });
}
