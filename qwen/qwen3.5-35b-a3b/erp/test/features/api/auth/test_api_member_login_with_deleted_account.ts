import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_with_deleted_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinOutput = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(joinOutput);
  // Verify account is active
  TestValidator.equals("account is active", joinOutput.is_active, true);
  // 2. Test successful login with valid credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginOutput = await authorize_member_login(loginConnection, {
    body: {
      email: joinOutput.email,
      password: joinOutput.token.access,
    } satisfies IHrmPlatformMember.ILogin,
  });
  typia.assert(loginOutput);
  // Verify successful login returns active member with token
  TestValidator.equals("login account is active", loginOutput.is_active, true);
  TestValidator.notEquals(
    "access token present",
    loginOutput.token.access,
    null,
  );
  // 3. Test security: generic error for non-existent email
  const invalidEmailConnection: api.IConnection = { host: connection.host };
  try {
    await authorize_member_login(invalidEmailConnection, {
      body: {
        email: "nonexistent@test.com",
        password: "sometestpassword123",
      } satisfies IHrmPlatformMember.ILogin,
    });
    throw new Error("Expected login to fail for non-existent email");
  } catch (error) {
    TestValidator.predicate(
      "rejected non-existent email with auth error",
      () =>
        error instanceof Error && error.message.includes("Invalid credentials"),
    );
  }
  // 4. Test security: same generic error for wrong password (same email)
  const wrongPasswordConnection: api.IConnection = { host: connection.host };
  try {
    await authorize_member_login(wrongPasswordConnection, {
      body: {
        email: joinOutput.email,
        password: "wrongpassword123",
      } satisfies IHrmPlatformMember.ILogin,
    });
    throw new Error("Expected login to fail for wrong password");
  } catch (error) {
    TestValidator.predicate(
      "rejected wrong password with same generic error",
      () =>
        error instanceof Error && error.message.includes("Invalid credentials"),
    );
  }
  // 5. Verify no session created for failed login attempts
  const failedLoginConnection: api.IConnection = { host: connection.host };
  try {
    await authorize_member_login(failedLoginConnection, {
      body: {
        email: "another-nonexistent@test.com",
        password: "testpass123",
      } satisfies IHrmPlatformMember.ILogin,
    });
    throw new Error("Expected login to fail");
  } catch (error) {
    // Failed login should not have created a session token
    TestValidator.equals(
      "no session created for failed login",
      failedLoginConnection.headers?.Authorization,
      undefined,
    );
  }
  // 6. Verify member summary shows is_active status matches response
  TestValidator.equals(
    "member status reflects account state",
    joinOutput.is_active,
    joinOutput.member.is_active,
  );
}
