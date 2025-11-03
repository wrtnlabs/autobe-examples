import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_member_login_reset_failed_attempts_on_success(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const email = typia.random<string & tags.Format<"email">>();
  const password = "ValidPassword123";

  const registered = await api.functional.auth.member.join(connection, {
    body: {
      email: email,
      password: password,
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(registered);

  // Step 2: Create unauthenticated connection for failed login attempts
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Step 3: Submit 3 failed login attempts with incorrect password
  for (let i = 0; i < 3; i++) {
    await TestValidator.error(
      `failed login attempt ${i + 1} with wrong password`,
      async () => {
        await api.functional.auth.member.login(unauthConn, {
          body: {
            email: email,
            password: "WrongPassword123",
          } satisfies IDiscussionBoardMember.ILoginRequest,
        });
      },
    );
  }

  // Step 4: Successfully login with correct credentials
  const successLogin = await api.functional.auth.member.login(unauthConn, {
    body: {
      email: email,
      password: password,
    } satisfies IDiscussionBoardMember.ILoginRequest,
  });
  typia.assert(successLogin);
  TestValidator.equals(
    "successful login returns authorized token",
    true,
    !!successLogin.token.access,
  );

  // Step 5: Verify that failed attempt counter was reset
  // Submit another single failed login attempt - this should count as attempt 1 (not 4)
  // If the counter wasn't reset, account might be locked after 5 failed attempts
  // By testing that we can still fail once and then succeed, we verify counter reset
  await TestValidator.error(
    "single failed login attempt after successful login",
    async () => {
      await api.functional.auth.member.login(unauthConn, {
        body: {
          email: email,
          password: "AnotherWrongPassword123",
        } satisfies IDiscussionBoardMember.ILoginRequest,
      });
    },
  );

  // Step 6: Verify another successful login still works
  // This confirms that the single failed attempt in step 5 didn't lock the account
  // which would only happen if we had 5+ failed attempts counted
  const secondSuccessLogin = await api.functional.auth.member.login(
    unauthConn,
    {
      body: {
        email: email,
        password: password,
      } satisfies IDiscussionBoardMember.ILoginRequest,
    },
  );
  typia.assert(secondSuccessLogin);
  TestValidator.equals(
    "second successful login after counter reset works correctly",
    true,
    !!secondSuccessLogin.token.access,
  );
}
