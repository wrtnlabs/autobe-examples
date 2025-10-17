import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussVerifiedExpert } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpert";
import type { IEconDiscussVerifiedExpertEmail } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertEmail";
import type { IEconDiscussVerifiedExpertEmailVerify } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertEmailVerify";
import type { IEconDiscussVerifiedExpertJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertJoin";

export async function test_api_verified_expert_email_verify_success(
  connection: api.IConnection,
) {
  // 1) Join as a verified expert to obtain an authenticated session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: `P@ssw0rd!${RandomGenerator.alphaNumeric(4)}`,
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEconDiscussVerifiedExpertJoin.ICreate;

  const authorized: IEconDiscussVerifiedExpert.IAuthorized =
    await api.functional.auth.verifiedExpert.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2) Request a verification email dispatch for the authenticated user
  const sendReq = {
    locale: "en-US",
    redirect_uri: `https://example.com/verify/callback/${RandomGenerator.alphaNumeric(8)}`,
  } satisfies IEconDiscussVerifiedExpertEmail.IRequest;

  const sent: IEconDiscussVerifiedExpertEmail.ISent =
    await api.functional.auth.verifiedExpert.email.sendVerification(
      connection,
      {
        body: sendReq,
      },
    );
  typia.assert(sent);

  // 3) Verify email with a synthetic token (suitable for simulation mode)
  const verified: IEconDiscussVerifiedExpertEmail.IVerified =
    await api.functional.auth.verifiedExpert.email.verify.verifyEmail(
      connection,
      {
        body: {
          token: RandomGenerator.alphaNumeric(32),
        } satisfies IEconDiscussVerifiedExpertEmailVerify.ICreate,
      },
    );
  typia.assert(verified);
}
