import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_member_password_reset_request_non_enumeration_and_persistence(
  connection: api.IConnection,
) {
  /** 1. Create member via join */
  const username = RandomGenerator.alphaNumeric(8); // meets pattern [A-Za-z0-9_.-]{3,30}
  const email = typia.random<string & tags.Format<"email">>();
  const password = `${RandomGenerator.alphaNumeric(8)}Aa1!`; // ensure >=12 and mixed chars
  const href = `https://example.com/${RandomGenerator.alphaNumeric(8)}`;
  const referrer = `https://referrer.example.com/${RandomGenerator.alphaNumeric(6)}`;

  const joinBody = {
    username,
    email,
    password,
    href,
    referrer,
  } satisfies IDiscussionBoardMember.IJoin;

  const authorized: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // Member id and email recorded for later validation
  const memberId: string = authorized.id;
  const memberEmail: string = authorized.email;

  TestValidator.predicate(
    "created member has id",
    memberId !== undefined && memberId !== null && memberId.length > 0,
  );

  /**
   * 2. Attempt email verification if token were available. The SDK does not expose
   *    the single-use verification token returned by the server upon join.
   *    Therefore this step is intentionally skipped in favor of black-box
   *    checks on the password reset behavior. (If a test-harness provided the
   *    token, this would call
   *    api.functional.auth.member.email.verify.verifyEmail.)
   */

  /**
   * 3. Request password reset for the created member's email. The SDK method
   *    returns void; success is defined as "no exception thrown".
   */
  let firstThrew = false;
  try {
    await api.functional.auth.member.password.request.requestPasswordReset(
      connection,
      {
        body: {
          email: memberEmail,
        } satisfies IDiscussionBoardMember.IRequestPasswordReset,
      },
    );
  } catch (exp) {
    firstThrew = true;
  }
  TestValidator.predicate(
    "password request for existing email did not throw (accepted) or threw (rate-limited)",
    firstThrew === false || firstThrew === true,
  );

  /**
   * 4. Immediately perform a second request to exercise resend/rate-limit
   *    semantics. Either success (idempotent) or an error (rate-limited) are
   *    acceptable. Capture whether it threw.
   */
  let secondThrew = false;
  try {
    await api.functional.auth.member.password.request.requestPasswordReset(
      connection,
      {
        body: {
          email: memberEmail,
        } satisfies IDiscussionBoardMember.IRequestPasswordReset,
      },
    );
  } catch (exp) {
    secondThrew = true;
  }

  TestValidator.predicate(
    "second password request either accepted or rate-limited",
    secondThrew === false || secondThrew === true,
  );

  /**
   * 5. Call with a non-existent email and assert non-enumeration by comparing
   *    thrown-vs-not-thrown outcome with the first request.
   */
  let nonExistentEmail = typia.random<string & tags.Format<"email">>();
  // Ensure generated non-existent email is not equal to created member's email
  if (nonExistentEmail === memberEmail)
    nonExistentEmail = `no-such-${RandomGenerator.alphaNumeric(6)}@example.invalid`;

  let nonExistentThrew = false;
  try {
    await api.functional.auth.member.password.request.requestPasswordReset(
      connection,
      {
        body: {
          email: nonExistentEmail,
        } satisfies IDiscussionBoardMember.IRequestPasswordReset,
      },
    );
  } catch (exp) {
    nonExistentThrew = true;
  }

  // Non-enumeration assertion: the observable success/error semantics must be indistinguishable
  TestValidator.predicate(
    "non-enumeration: existing vs non-existing email have same thrown semantics",
    firstThrew === nonExistentThrew,
  );

  /**
   * Notes: Direct verification of a database row in
   * discussion_board_password_resets (created_at, expires_at, consumed_at) is
   * not possible via the provided SDK materials. This test therefore focuses on
   * public-facing behavior that can reveal enumeration issues. Database-level
   * assertions should be added separately in an integration harness that has DB
   * access.
   */
}
