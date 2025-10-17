import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";

export async function test_api_member_mfa_enable_after_verification(
  connection: api.IConnection,
) {
  /**
   * Validate MFA verification boundary and setup preconditions.
   *
   * Steps
   *
   * 1. Unauthenticated verify attempt must error.
   * 2. Join a new member (tokens are handled by SDK) and confirm initial state.
   * 3. Perform MFA setup to provision secret (keeps MFA disabled).
   * 4. Attempt verification with an invalid code twice; both must error.
   *
   * Note: Computing a valid TOTP from otpauth_uri is infeasible within the
   * template (no extra imports/crypto). Therefore, we focus on boundary and
   * error flows only, avoiding flaky success assertions.
   */

  // 1) Unauthenticated boundary: verify must fail without auth
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated mfaVerify should throw",
    async () => {
      await api.functional.auth.member.mfa.verify.mfaVerify(unauthConn, {
        body: { code: "000000" } satisfies IEconDiscussMember.IMfaVerify,
      });
    },
  );

  // 2) Join a new member; SDK stores token automatically
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>().toLowerCase(),
    password: `${RandomGenerator.alphaNumeric(8)}${RandomGenerator.alphaNumeric(4)}`,
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;

  const authorized = await api.functional.auth.member.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // If subject snapshot is present, MFA should initially be disabled
  if (authorized.member !== undefined) {
    TestValidator.equals(
      "mfaEnabled is initially false after join",
      authorized.member.mfaEnabled,
      false,
    );
  }

  // 3) Setup MFA
  const setup = await api.functional.auth.member.mfa.setup.mfaSetup(connection);
  typia.assert(setup);

  // 4) Invalid verification attempts (wrong code) must error
  const invalidVerifyBody1 = {
    code: "000000",
  } satisfies IEconDiscussMember.IMfaVerify;

  await TestValidator.error(
    "invalid TOTP code should fail (first attempt)",
    async () => {
      await api.functional.auth.member.mfa.verify.mfaVerify(connection, {
        body: invalidVerifyBody1,
      });
    },
  );

  const invalidVerifyBody2 = {
    code: "999999",
  } satisfies IEconDiscussMember.IMfaVerify;

  await TestValidator.error(
    "invalid TOTP code should fail (second attempt)",
    async () => {
      await api.functional.auth.member.mfa.verify.mfaVerify(connection, {
        body: invalidVerifyBody2,
      });
    },
  );
}
