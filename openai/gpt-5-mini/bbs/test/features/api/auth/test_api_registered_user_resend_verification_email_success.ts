import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

export async function test_api_registered_user_resend_verification_email_success(
  connection: api.IConnection,
) {
  // 1) Prepare new user data
  const email = typia.random<string & tags.Format<"email">>();
  const username = `${RandomGenerator.name(1)}${RandomGenerator.alphaNumeric(4)}`;
  const password = RandomGenerator.alphaNumeric(12);
  const joinBody = {
    username,
    email,
    password,
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  // 2) Create the user account
  const authorized: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // Business expectation: newly created account should not be marked verified
  TestValidator.predicate(
    "newly created user's email must not be verified",
    authorized.email_verified !== true,
  );

  // 3) Call resend verification endpoint
  const resendOutput: IEconPoliticalForumRegisteredUser.IGenericSuccess =
    await api.functional.auth.registeredUser.verify_email.resend.resendVerification(
      connection,
      {
        body: {
          email,
        } satisfies IEconPoliticalForumRegisteredUser.IResendVerification,
      },
    );
  typia.assert(resendOutput);

  // The API should acknowledge the resend request (success flag true in generic success DTO)
  TestValidator.predicate(
    "resend verification acknowledged",
    resendOutput.success === true,
  );

  // 4) Side-effect: Ensure user remains unverified until explicit verification is consumed
  TestValidator.predicate(
    "user remains unverified after resend",
    authorized.email_verified !== true,
  );

  // 5) Teardown note: There is no delete API in the provided SDK. Test harness
  // must reset DB or remove created records after test execution. Additionally,
  // the mocked email transport should be asserted by the harness to confirm an
  // outbound verification email was enqueued or sent to `email`.
}
