import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_two_factor_disable_already_disabled(
  connection: api.IConnection,
) {
  // Create a registered user account that will not have 2FA enabled by default
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userData = {
    username: RandomGenerator.alphaNumeric(10),
    email: userEmail,
    password: "TestPassword123!",
    href: "https://example.com/register",
    referrer: "https://google.com",
  } satisfies IRedditPlatformRegisteredUser.ICreate;

  const createdUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: userData,
    });
  typia.assert(createdUser);

  // Verify the user was created successfully and 2FA is disabled by default
  TestValidator.equals(
    "user created successfully",
    createdUser.username,
    userData.username,
  );
  TestValidator.predicate(
    "2FA should be disabled by default",
    !createdUser.twoFactorEnabled,
  );

  // Attempt to disable 2FA when it's already disabled
  const disableRequestBody =
    {} satisfies IRedditPlatformRegisteredUser.ITwoFactorDisable;

  const disableResult: IRedditPlatformRegisteredUser.ITwoFactorDisableResult =
    await api.functional.redditPlatform.registeredUser.auth.twoFactor.disable.twoFactorDisable(
      connection,
      {
        body: disableRequestBody,
      },
    );
  typia.assert(disableResult);

  // Validate the response indicates 2FA was already disabled
  TestValidator.equals(
    "disable operation completed",
    disableResult.success,
    true,
  );
  TestValidator.predicate(
    "response should indicate already disabled",
    disableResult.message.toLowerCase().includes("already") ||
      disableResult.message.toLowerCase().includes("not enabled") ||
      disableResult.message.toLowerCase().includes("disabled"),
  );
  TestValidator.predicate(
    "should have disabled timestamp",
    disableResult.disabledAt !== undefined,
  );
  TestValidator.predicate(
    "security event should be logged",
    disableResult.securityEventId !== undefined,
  );
}
