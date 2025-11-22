import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionContentModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionContentModerator";

export async function test_api_moderator_login_invalid_email(
  connection: api.IConnection,
) {
  // Step 1: Create a valid moderator account for baseline testing
  const validModeratorEmail: string = typia.random<
    string & tags.Format<"email">
  >();

  const validModerator: IEconPoliticalDiscussionContentModerator.IAuthorized =
    await api.functional.auth.contentModerator.join.register(connection, {
      body: {
        display_name: RandomGenerator.name(),
        email: validModeratorEmail,
        password: "ValidPass123!",
        bio: "Test moderator for invalid email login test",
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        href: "https://example.com/moderator/register",
        referrer: "https://example.com/login",
      } satisfies IEconPoliticalDiscussionContentModerator.ICreate,
    });
  typia.assert(validModerator);

  // Step 2: Test login failure with non-existent email
  const nonExistentEmail: string = "nonexistent@example.com";

  await TestValidator.error(
    "login should fail with non-existent email",
    async () => {
      await api.functional.auth.contentModerator.login.authenticate(
        connection,
        {
          body: {
            email: nonExistentEmail,
            password: "SomePassword123!",
            href: "https://example.com/moderator/login",
            referrer: "https://example.com/",
          } satisfies IEconPoliticalDiscussionContentModerator.ILogin,
        },
      );
    },
  );
}
