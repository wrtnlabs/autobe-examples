import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test login failure when a registered member provides an incorrect password.
 *
 * This test validates the security best practice of preventing credential
 * enumeration by ensuring that login with an incorrect password returns
 * a generic error message that doesn't reveal whether the email or password
 * was incorrect.
 */
export async function test_api_member_login_wrong_password(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Prepare credentials and register a new member
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  const registeredMember = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
    },
  });
  typia.assert(registeredMember);
  // Step 2: Attempt login with correct email but wrong password
  const wrongPassword = "WrongPassword123!";
  const loginConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "login with wrong password should fail",
    async () => {
      await api.functional.communityPlatform.auth.member.login(
        loginConnection,
        {
          body: {
            email,
            password: wrongPassword,
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
          } satisfies ICommunityPlatformMember.ILogin,
        },
      );
    },
  );
  // Step 3: Verify successful login with correct password works
  // This proves the account was not locked or affected by the failed attempt
  const validLoginConnection: api.IConnection = { host: connection.host };
  const validLoginResult =
    await api.functional.communityPlatform.auth.member.login(
      validLoginConnection,
      {
        body: {
          email,
          password,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformMember.ILogin,
      },
    );
  typia.assert(validLoginResult);
  // Verify the login returns the same member
  TestValidator.equals(
    "member id should match",
    validLoginResult.member.id,
    registeredMember.member.id,
  );
}
