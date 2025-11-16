import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPolDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardMember";

export async function test_api_member_login_existing_account(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account for login testing
  const username = RandomGenerator.alphaNumeric(10);
  const email = `${username}@example.com` satisfies string &
    tags.Format<"email">;
  const password = RandomGenerator.alphaNumeric(12);

  // 1.1 Call join API to create new member
  const member: IEconPolDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: username,
        password: password,
        email: email,
      } satisfies IEconPolDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Successfully login using the just created member credentials
  const loginOutput: IEconPolDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: {
        username_or_email: username,
        password: password,
        href: "https://localhost/login",
        referrer: "https://localhost",
      } satisfies IEconPolDiscussionBoardMember.ILogin,
    });
  typia.assert(loginOutput);

  // Validate the member info from login matches the created member
  TestValidator.equals(
    "login username matches created",
    loginOutput.username,
    member.username,
  );
  TestValidator.equals(
    "login email matches created",
    loginOutput.email,
    member.email,
  );
  TestValidator.equals(
    "login token access equals create token access",
    loginOutput.token.access,
    member.token.access,
  );
  TestValidator.equals(
    "login token refresh equals create token refresh",
    loginOutput.token.refresh,
    member.token.refresh,
  );

  // Step 3: Test that login with invalid credentials is rejected
  await TestValidator.error("login with incorrect password fails", async () => {
    await api.functional.auth.member.login(connection, {
      body: {
        username_or_email: username,
        password: password + "wrong",
        href: "https://localhost/login",
        referrer: "https://localhost",
      } satisfies IEconPolDiscussionBoardMember.ILogin,
    });
  });
  await TestValidator.error(
    "login with non-existing username fails",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: {
          username_or_email: "unknownuser",
          password: password,
          href: "https://localhost/login",
          referrer: "https://localhost",
        } satisfies IEconPolDiscussionBoardMember.ILogin,
      });
    },
  );
}
