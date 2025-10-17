import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";

/**
 * Provision MFA setup for a member with auth boundary and non-enablement
 * guarantee.
 *
 * Steps:
 *
 * 1. Verify unauthenticated access to POST /auth/member/mfa/setup results in an
 *    error (auth boundary).
 * 2. Register a new member via POST /auth/member/join and assert the authorization
 *    payload.
 * 3. Call POST /auth/member/mfa/setup with the authenticated context and validate
 *    provisioning data.
 * 4. Optionally call setup again and validate it still returns a valid
 *    provisioning bundle.
 *
 * Notes:
 *
 * - Do not assert specific HTTP status codes; just ensure an error occurs when
 *   unauthenticated.
 * - Do not manipulate connection.headers directly; use a fresh connection object
 *   for unauthenticated tests.
 */
export async function test_api_member_mfa_setup_provisioning(
  connection: api.IConnection,
) {
  // 1) Unauthenticated access should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "mfa setup should fail without authentication",
    async () => {
      await api.functional.auth.member.mfa.setup.mfaSetup(unauthConn);
    },
  );

  // 2) Register a new member to obtain authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12), // >= 8 chars
    display_name: RandomGenerator.paragraph({ sentences: 2 }),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;

  const auth = await api.functional.auth.member.join(connection, {
    body: joinBody,
  });
  typia.assert<IEconDiscussMember.IAuthorized>(auth);

  // Ensure joined subject is either absent or has mfaEnabled=false
  await TestValidator.predicate(
    "joined member should not have MFA enabled",
    () => auth.member === undefined || auth.member.mfaEnabled === false,
  );

  // 3) Call MFA setup with authenticated connection
  const provision1 =
    await api.functional.auth.member.mfa.setup.mfaSetup(connection);
  typia.assert<IEconDiscussMember.IMfaSetup>(provision1);

  // Validate otpauth scheme is used (business-level check)
  TestValidator.predicate(
    "otpauth_uri uses otpauth scheme",
    provision1.otpauth_uri.startsWith("otpauth://"),
  );

  // 4) Optional: call setup again to ensure it returns a valid provisioning bundle
  const provision2 =
    await api.functional.auth.member.mfa.setup.mfaSetup(connection);
  typia.assert<IEconDiscussMember.IMfaSetup>(provision2);

  // Do not assert rotation to avoid flakiness; simply ensure it is valid and has otpauth scheme
  TestValidator.predicate(
    "second provisioning also uses otpauth scheme",
    provision2.otpauth_uri.startsWith("otpauth://"),
  );
}
