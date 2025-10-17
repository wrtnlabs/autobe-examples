import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussVerifiedExpert } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpert";
import type { IEconDiscussVerifiedExpertEmail } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertEmail";
import type { IEconDiscussVerifiedExpertJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertJoin";

/**
 * Verified Expert: request verification email (authenticated success path).
 *
 * This test validates that a newly joined verifiedExpert session can trigger
 * the email verification send workflow and receive a non-sensitive
 * acknowledgement. It also ensures unauthenticated requests fail.
 *
 * Steps
 *
 * 1. Join as verifiedExpert (auto-issues token and sets Authorization header)
 * 2. Call POST /auth/verifiedExpert/email/sendVerification with locale and
 *    redirect_uri
 * 3. Call it again to ensure repeat requests still acknowledge (rate limit is
 *    implementation-specific)
 * 4. Verify an unauthenticated connection attempt fails (error expected)
 */
export async function test_api_verified_expert_verification_email_send_success(
  connection: api.IConnection,
) {
  // 1) Join as verified expert - establishes authenticated context
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string = RandomGenerator.alphaNumeric(12); // >= 8 chars
  const displayName: string = RandomGenerator.name(2);

  const joinBody = {
    email,
    password,
    display_name: displayName,
    timezone: "Asia/Seoul",
    locale: "en-US",
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEconDiscussVerifiedExpertJoin.ICreate;

  const authorized: IEconDiscussVerifiedExpert.IAuthorized =
    await api.functional.auth.verifiedExpert.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // Business validations from join
  TestValidator.equals(
    "session role is verifiedExpert",
    authorized.role,
    "verifiedExpert",
  );
  TestValidator.equals(
    "email is not verified immediately after join",
    authorized.email_verified,
    false,
  );
  TestValidator.predicate(
    "access token must be non-empty",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );

  // 2) Send verification email (happy-path)
  const sendBody = {
    locale: "en-US",
    redirect_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEconDiscussVerifiedExpertEmail.IRequest;

  const sent1: IEconDiscussVerifiedExpertEmail.ISent =
    await api.functional.auth.verifiedExpert.email.sendVerification(
      connection,
      { body: sendBody },
    );
  typia.assert(sent1);

  // 3) Second send attempt should still return valid acknowledgement shape
  const sent2: IEconDiscussVerifiedExpertEmail.ISent =
    await api.functional.auth.verifiedExpert.email.sendVerification(
      connection,
      { body: sendBody },
    );
  typia.assert(sent2);

  // 4) Negative: unauthenticated connection must error
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated sendVerification should fail",
    async () => {
      await api.functional.auth.verifiedExpert.email.sendVerification(
        unauthConn,
        {
          body: {
            locale: "en-US",
          } satisfies IEconDiscussVerifiedExpertEmail.IRequest,
        },
      );
    },
  );
}
