import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";

/**
 * Disable MFA with a valid factor and enforce boundaries.
 *
 * Flow
 *
 * 1. Join a new member to obtain Authorization (SDK sets header automatically)
 * 2. Start MFA setup to provision secret and recovery codes (server-side)
 * 3. Verify MFA (enable) using a valid-shaped payload (code or recovery_code)
 * 4. Auth boundary: unauthenticated DELETE /auth/member/mfa must error
 * 5. Policy: wrong factor must error even when authenticated
 * 6. Disable MFA with a valid-shaped factor; expect mfa_enabled=false
 * 7. Idempotency: disable again; expect stable false
 */
export async function test_api_mfa_disable_with_valid_code(
  connection: api.IConnection,
) {
  // 1) Register and authenticate a member
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string = RandomGenerator.alphaNumeric(12);
  const joinBody = {
    email,
    password,
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const authorized: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: joinBody });
  typia.assert(authorized);

  // 2) Start MFA setup
  const setup: IEconDiscussMember.IMfaSetup =
    await api.functional.auth.member.mfa.setup.mfaSetup(connection);
  typia.assert(setup);

  // 3) Verify MFA (enable) — provide acceptable body shape per docs
  const verifyBody = {
    code: "123456",
  } satisfies IEconDiscussMember.IMfaVerify;
  const enabled: IEconDiscussMember.IMfaEnabled =
    await api.functional.auth.member.mfa.verify.mfaVerify(connection, {
      body: verifyBody,
    });
  typia.assert(enabled);

  // 4) Auth boundary: unauthenticated attempt must error
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated member cannot disable MFA",
    async () => {
      await api.functional.auth.member.mfa.mfaDisable(unauthConn, {
        body: {
          recovery_code: RandomGenerator.alphaNumeric(10),
        } satisfies IEconDiscussMember.IMfaDisable,
      });
    },
  );

  // 5) Wrong factor while authenticated must error
  await TestValidator.error("invalid factor rejects MFA disable", async () => {
    await api.functional.auth.member.mfa.mfaDisable(connection, {
      body: { totp_code: "000000" } satisfies IEconDiscussMember.IMfaDisable,
    });
  });

  // 6) Disable MFA with a valid-shaped factor (use recovery_code field)
  const disableBody = {
    recovery_code: RandomGenerator.alphaNumeric(12),
  } satisfies IEconDiscussMember.IMfaDisable;
  const disabled: IEconDiscussMember.IMfaDisabled =
    await api.functional.auth.member.mfa.mfaDisable(connection, {
      body: disableBody,
    });
  typia.assert(disabled);
  TestValidator.equals(
    "MFA disabled flag is false",
    disabled.mfa_enabled,
    false,
  );

  // 7) Idempotency: calling disable again is safe
  const disabledAgain: IEconDiscussMember.IMfaDisabled =
    await api.functional.auth.member.mfa.mfaDisable(connection, {
      body: disableBody,
    });
  typia.assert(disabledAgain);
  TestValidator.equals(
    "disabling again stays false",
    disabledAgain.mfa_enabled,
    false,
  );
}
