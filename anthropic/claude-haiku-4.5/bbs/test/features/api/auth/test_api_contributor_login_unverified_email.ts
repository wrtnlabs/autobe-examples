import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";

export async function test_api_contributor_login_unverified_email(
  connection: api.IConnection,
) {
  // Step 1: Register contributor with unverified email
  const email = "charlie@example.com";
  const password = "SecurePassword123!";
  const username = RandomGenerator.name().replace(/\s+/g, "_");
  const href = "https://example.com/register";
  const referrer = "https://example.com";

  const registered = await api.functional.auth.contributor.join(connection, {
    body: {
      email,
      username: username.substring(0, 50),
      password,
      href,
      referrer,
    } satisfies IDiscussionBoardContributor.ICreate,
  });

  typia.assert(registered);
  TestValidator.equals("registered email matches", registered.email, email);
  TestValidator.predicate(
    "email is unverified",
    registered.email_verified === false,
  );
  TestValidator.equals(
    "account status is active",
    registered.account_status,
    "active",
  );

  // Step 2: Attempt to login with unverified email
  // The login should fail because email_verified is false
  await TestValidator.error(
    "login should fail for unverified email",
    async () => {
      await api.functional.auth.contributor.login(connection, {
        body: {
          email,
          password,
          href,
          referrer,
        } satisfies IDiscussionBoardContributor.ILogin,
      });
    },
  );
}
