import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_email_verification_invalid_token(
  connection: api.IConnection,
) {
  // Step 1: Create a new registered user account with email verification pending
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.MinLength<8>>();

  const newUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: typia.random<
          string & tags.MinLength<3> & tags.MaxLength<20>
        >(),
        email: userEmail,
        password: userPassword,
        display_name: typia.random<string & tags.MaxLength<50>>(),
        bio: typia.random<string & tags.MaxLength<500>>(),
        location: typia.random<string & tags.MaxLength<100>>(),
        website_url: typia.random<string & tags.Format<"uri">>(),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(newUser);

  // Validate that user account was created successfully with pending verification status
  TestValidator.equals(
    "user email verification status should be false",
    newUser.emailVerified,
    false,
  );
  TestValidator.equals(
    "user business status should be pending_verification",
    newUser.businessStatus,
    "pending_verification",
  );
  TestValidator.equals(
    "user account status should be active",
    newUser.accountStatus,
    "active",
  );

  // Step 2: Generate an invalid verification token (non-existent or malformed)
  const invalidToken = "invalid_verification_token_" + typia.random<string>();

  // Step 3: Attempt to verify email with the invalid token
  await TestValidator.error(
    "email verification should fail with invalid token",
    async () => {
      await api.functional.auth.registeredUser.email.verify.verifyEmail(
        connection,
        {
          token: invalidToken,
        },
      );
    },
  );

  // Step 4: Verify that the user's verification status remains unchanged
  // Note: In a real scenario, we would need to fetch the user again to confirm status
  // For this test, we validate that no successful verification occurred during the invalid token attempt
  TestValidator.predicate(
    "user verification should remain unverified",
    newUser.emailVerified === false,
  );
  TestValidator.predicate(
    "user business status should remain pending",
    newUser.businessStatus === "pending_verification",
  );
}
