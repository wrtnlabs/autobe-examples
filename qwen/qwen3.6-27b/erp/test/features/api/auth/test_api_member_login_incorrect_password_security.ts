import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Verify that the system rejects a login request with an incorrect password and returns a generic error to prevent credential enumeration.
 *
 * The test first registers a new member using the join operation so that the email address is known to exist.
 * It then attempts to login using the correct email but a wrong password.
 * The system must return a 401 Unauthorized response.
 * Crucially, the response message must not distinguish between 'user not found' and 'wrong password',
 * ensuring that an attacker cannot use this endpoint to confirm the existence of registered email addresses.
 *
 * 1. Register a new member with a known email and password.
 * 2. Attempt to login with the correct email but an incorrect password.
 * 3. Verify that the login fails with 401 Unauthorized.
 * 4. Verify that the error message does not distinguish between user not found and wrong password.
 */
export async function test_api_member_login_incorrect_password_security(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmPlatformMember.IJoin;
  const joinedMember = await api.functional.hrmPlatform.auth.member.join(
    memberConnection,
    {
      body: joinBody,
    },
  );
  typia.assert(joinedMember);
  // 2. Attempt to login with incorrect password
  const loginConnection: api.IConnection = { host: connection.host };
  const loginBody: IHrmPlatformMember.ILogin = {
    email: joinBody.email,
    password: RandomGenerator.alphaNumeric(16), // Different password than the one used to join
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmPlatformMember.ILogin;
  // 3. Verify that the login fails with 401 Unauthorized
  await TestValidator.httpError(
    "login with incorrect password returns 401 Unauthorized",
    401,
    async () => {
      await api.functional.hrmPlatform.auth.member.login(loginConnection, {
        body: loginBody,
      });
    },
  );
  // 4. Verify that the error message does not distinguish between user not found and wrong password
  // We also try with a non-existent email to confirm the same error message is returned
  const nonExistentLoginConnection: api.IConnection = { host: connection.host };
  const nonExistentLoginBody: IHrmPlatformMember.ILogin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmPlatformMember.ILogin;
  let wrongPasswordError: api.HttpError | undefined;
  await TestValidator.httpError(
    "login with incorrect password captures error",
    401,
    async () => {
      try {
        await api.functional.hrmPlatform.auth.member.login(loginConnection, {
          body: loginBody,
        });
      } catch (exp) {
        if (typia.is<api.HttpError>(exp)) {
          wrongPasswordError = exp;
        }
      }
    },
  );
  let nonExistentError: api.HttpError | undefined;
  await TestValidator.httpError(
    "login with non-existent email captures error",
    401,
    async () => {
      try {
        await api.functional.hrmPlatform.auth.member.login(
          nonExistentLoginConnection,
          {
            body: nonExistentLoginBody,
          },
        );
      } catch (exp) {
        if (typia.is<api.HttpError>(exp)) {
          nonExistentError = exp;
        }
      }
    },
  );
  // Verify both errors have the same message to prevent credential enumeration
  TestValidator.equals(
    "error messages for wrong password and non-existent user are identical",
    wrongPasswordError?.message,
    nonExistentError?.message,
  );
}
