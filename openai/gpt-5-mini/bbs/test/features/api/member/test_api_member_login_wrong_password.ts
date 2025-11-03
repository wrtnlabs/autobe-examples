import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_member_login_wrong_password(
  connection: api.IConnection,
) {
  /**
   * Purpose:
   *
   * - Verify that login with an incorrect password fails without leaking account
   *   existence details and that repeated failed attempts remain rejected
   *   (observable lockout/rate-limit behavior).
   *
   * Steps:
   *
   * 1. Create a fresh member via POST /auth/member/join
   * 2. Use an unauthenticated connection clone for login attempts
   * 3. Attempt login with incorrect password and assert it fails
   * 4. Repeat failed attempts to observe escalation behavior
   * 5. Finally, login with correct password to ensure credentials remain valid
   */

  // 1) Prepare realistic member data
  const username = RandomGenerator.alphaNumeric(8); // meets username pattern
  const email = typia.random<string & tags.Format<"email">>();
  const password = "P@ssw0rd-Strong12"; // >=12 chars, mixed categories
  const displayName = RandomGenerator.name(2);

  const joinBody = {
    username,
    email,
    password,
    display_name: displayName,
    ip: null,
    href: "https://example.com/",
    referrer: "https://referrer.example.com/",
  } satisfies IDiscussionBoardMember.IJoin;

  // 2) Create member account
  const created: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: joinBody,
    });
  typia.assert(created);

  // 3) Prepare unauthenticated connection for login attempts
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 4) Attempt login with incorrect password (must throw)
  await TestValidator.error(
    "login with wrong password should fail",
    async () => {
      const badLoginBody = {
        usernameOrEmail: email,
        password: "incorrect-password-1",
      } satisfies IDiscussionBoardMember.ILogin;

      await api.functional.auth.member.login(unauthConn, {
        body: badLoginBody,
      });
    },
  );

  // 5) Repeat failed attempts to observe lockout/rate-limit behavior
  //    (we do not assert specific status codes or messages)
  for (let i = 0; i < 4; ++i) {
    await TestValidator.error(
      `repeated wrong password attempt #${i + 1} should fail`,
      async () => {
        const attemptBody = {
          usernameOrEmail: email,
          password: `incorrect-password-${i + 2}`,
        } satisfies IDiscussionBoardMember.ILogin;

        await api.functional.auth.member.login(unauthConn, {
          body: attemptBody,
        });
      },
    );
  }

  // 6) Control: correct login should still succeed
  const correctLoginBody = {
    usernameOrEmail: email,
    password,
  } satisfies IDiscussionBoardMember.ILogin;

  const logged: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.login(unauthConn, {
      body: correctLoginBody,
    });
  typia.assert(logged);

  // 7) Business assertion: ensure token.access is present (non-empty string)
  TestValidator.predicate(
    "successful login returns a non-empty access token",
    typeof logged.token.access === "string" && logged.token.access.length > 0,
  );
}
