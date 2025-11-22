import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionContentModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionContentModerator";

export async function test_api_moderator_login_wrong_password(
  connection: api.IConnection,
) {
  // Step 1: Create a content moderator account for testing
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const correctPassword = "SecurePass123!";
  const wrongPassword = "WrongPassword456!";

  // Register new moderator with valid credentials
  const moderator: IEconPoliticalDiscussionContentModerator.IAuthorized =
    await api.functional.auth.contentModerator.join.register(connection, {
      body: {
        display_name: RandomGenerator.name(),
        email: moderatorEmail,
        password: correctPassword,
        bio: "Test content moderator account",
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        ip: "192.168.1.100",
        href: "https://example.com/register",
        referrer: "https://google.com",
      } satisfies IEconPoliticalDiscussionContentModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Attempt to login with correct email but wrong password
  await TestValidator.error(
    "should fail authentication with wrong password",
    async () => {
      await api.functional.auth.contentModerator.login.authenticate(
        connection,
        {
          body: {
            email: moderatorEmail,
            password: wrongPassword,
            ip: "192.168.1.100",
            href: "https://example.com/login",
            referrer: "https://example.com",
          } satisfies IEconPoliticalDiscussionContentModerator.ILogin,
        },
      );
    },
  );

  // Step 3: Verify the moderator account was created successfully
  TestValidator.equals(
    "moderator account created successfully",
    moderator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "moderator has proper status",
    moderator.status,
    "active",
  );
  TestValidator.predicate(
    "moderator ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      moderator.id,
    ),
  );
}
