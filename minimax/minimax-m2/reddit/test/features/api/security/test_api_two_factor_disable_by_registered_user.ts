import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_two_factor_disable_by_registered_user(
  connection: api.IConnection,
) {
  // Step 1: Create a registered user account
  const userData = {
    username: `testuser_${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePassword123!",
    href: "https://example.com/register",
    referrer: "https://google.com",
  } satisfies IRedditPlatformRegisteredUser.ICreate;

  const registeredUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: userData,
    });
  typia.assert(registeredUser);

  // Step 2: Verify user was created with 2FA disabled by default
  TestValidator.equals(
    "new user should have 2FA disabled by default",
    registeredUser.twoFactorEnabled,
    false,
  );

  // Step 3: Call the 2FA disable endpoint (should handle case where 2FA is already disabled)
  const disableResult: IRedditPlatformRegisteredUser.ITwoFactorDisableResult =
    await api.functional.redditPlatform.registeredUser.auth.twoFactor.disable.twoFactorDisable(
      connection,
      {
        body: {} satisfies IRedditPlatformRegisteredUser.ITwoFactorDisable,
      },
    );
  typia.assert(disableResult);

  // Step 4: Validate the 2FA disable operation result
  TestValidator.equals(
    "2FA disable operation should succeed",
    disableResult.success,
    true,
  );

  TestValidator.equals(
    "disable result should have confirmation message",
    disableResult.message.length > 0,
    true,
  );

  TestValidator.equals(
    "disable result should have timestamp",
    disableResult.disabledAt.length > 0,
    true,
  );

  // Step 5: Validate security event logging is captured
  TestValidator.equals(
    "security event ID should be present for audit trail",
    disableResult.securityEventId !== null &&
      disableResult.securityEventId !== undefined,
    true,
  );

  TestValidator.equals(
    "security event ID should be a valid string",
    typeof disableResult.securityEventId === "string",
    true,
  );

  // Step 6: Verify the timestamp is in proper ISO format
  const disableTimestamp = new Date(disableResult.disabledAt);
  TestValidator.predicate(
    "disabled timestamp should be a valid date",
    !isNaN(disableTimestamp.getTime()),
  );

  // Step 7: Verify the operation completed recently (within last minute)
  const now = new Date();
  const timeDifference = now.getTime() - disableTimestamp.getTime();
  TestValidator.predicate(
    "disable operation should have completed recently",
    timeDifference >= 0 && timeDifference <= 60000, // Within last minute
  );
}
