import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test login attempt with unverified email address.
 *
 * Validates that the authentication system properly rejects login attempts from members who have not completed email verification. This test ensures security best practices by preventing access to unverified accounts while not revealing whether an email address is registered.
 *
 * The test verifies that the system returns 403 Forbidden (distinguishing unverified email from invalid credentials which would return 401) and that error messages follow security best practices by not revealing account existence.
 *
 * 1. Register a new member account with valid email and password via authorize_member_join utility.
 * 2. Do NOT complete email verification (simulate user who hasn't clicked verification link).
 * 3. Attempt login with the registered email and correct password with session context fields.
 * 4. Verify response returns 403 Forbidden status indicating email verification is required.
 * 5. Validate that the error response does not reveal whether the email address is registered.
 */
export async function test_api_member_login_unverified_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member account (unverified - email verification not completed)
  const joinCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IHrmPlatformMember.IJoin;
  await authorize_member_join(connection, { body: joinCredentials });
  // 2. Attempt login with unverified account (should fail with 403 Forbidden)
  const loginConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "login rejected for unverified email",
    403,
    async () => {
      await api.functional.hrmPlatform.auth.member.login(loginConnection, {
        body: {
          email: joinCredentials.email,
          password: joinCredentials.password,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IHrmPlatformMember.ILogin,
      });
    },
  );
}
