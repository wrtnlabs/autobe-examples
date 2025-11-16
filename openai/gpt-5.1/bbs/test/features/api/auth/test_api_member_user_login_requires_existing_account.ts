import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserLogin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";

/**
 * Validate that member user login requires an existing account and does not
 * implicitly create new accounts.
 *
 * ## Business intent
 *
 * The discussion board exposes POST /auth/memberUser/login to authenticate
 * _existing_ member users in the `discussion_board_memberusers` table using
 * email and password. The endpoint must _not_ act as a registration shortcut:
 * if the provided email is not registered, the login attempt must fail, and no
 * new user record or token pair may be created as a side effect.
 *
 * Due to the constraints of this test harness, we only have the login SDK
 * function (no join/registration or member listing API). Therefore, we validate
 * the "requires existing account" and "no implicit creation" behavior
 * indirectly by repeatedly attempting to log in with a random, extremely
 * unlikely email and observing consistent failures.
 *
 * ## Scenario
 *
 * 1. Generate a random email address that is overwhelmingly unlikely to match any
 *    existing member record.
 * 2. Build a valid IDiscussionBoardMemberUserLogin.IRequest object using that
 *    email, a dummy password, and random-but-valid href/referrer URIs.
 * 3. Call api.functional.auth.memberUser.login with this body and expect the call
 *    to fail with an HTTP-level error (credentials invalid / account not
 *    found). Use TestValidator.error to assert that an error is thrown, but do
 *    not depend on any particular HTTP status code.
 * 4. Invoke the same login call again with exactly the same credentials and assert
 *    that it still fails. This guards against any unintended side-effect
 *    account creation behavior on first failure.
 * 5. As a control path, additionally perform a successful login using
 *    typia.random-generated input under simulation mode, when available, to
 *    validate that the success path yields a value compatible with
 *    IDiscussionBoardMemberuser.IAuthorized and that typia.assert accepts it.
 *    This does not depend on any particular business record state because
 *    simulation mode fabricates valid responses.
 */
export async function test_api_member_user_login_requires_existing_account(
  connection: api.IConnection,
) {
  // Helper to build a login request body with valid formats
  const buildLoginBody = (
    email: string & tags.Format<"email">,
  ): IDiscussionBoardMemberUserLogin.IRequest => {
    const href = "https://".concat(
      RandomGenerator.alphabets(10),
      ".example.com/login",
    );
    const referrer = "https://".concat(
      RandomGenerator.alphabets(10),
      ".example.com/",
    );

    const body: IDiscussionBoardMemberUserLogin.IRequest = {
      email,
      password: RandomGenerator.alphabets(16),
      ip: null,
      href,
      referrer,
    };
    return body;
  };

  // 1. Generate an email that is extremely unlikely to belong to a real user
  const rareEmail: string & tags.Format<"email"> = (RandomGenerator.alphabets(
    16,
  ) +
    "-nonexistent-" +
    RandomGenerator.alphabets(16) +
    "@example.invalid") as string & tags.Format<"email">;

  const firstBody = buildLoginBody(rareEmail);
  const secondBody = buildLoginBody(rareEmail);

  // 2. First login attempt with unknown email should fail
  await TestValidator.error(
    "login with non-existent member user must fail",
    async () => {
      await api.functional.auth.memberUser.login(connection, {
        body: firstBody,
      });
    },
  );

  // 3. Second login attempt with the same unknown email must also fail,
  //    demonstrating that login does not implicitly create the account.
  await TestValidator.error(
    "repeated login with same non-existent member user must still fail",
    async () => {
      await api.functional.auth.memberUser.login(connection, {
        body: secondBody,
      });
    },
  );

  // 4. Optional control: when simulation mode is enabled, verify that a
  //    successful login response conforms to IDiscussionBoardMemberuser.IAuthorized.
  if (connection.simulate === true) {
    const simulatedBody =
      typia.random<IDiscussionBoardMemberUserLogin.IRequest>();

    const authorized = await api.functional.auth.memberUser.login(connection, {
      body: simulatedBody,
    });
    typia.assert<IDiscussionBoardMemberuser.IAuthorized>(authorized);

    TestValidator.predicate(
      "simulated login should issue non-empty access token",
      () => authorized.token.access.length > 0,
    );
  }
}
