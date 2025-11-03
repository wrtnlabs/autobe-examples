import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Validate user login with valid credentials.
 *
 * 1. Register a user with random credentials (unique email, valid password, random
 *    display_name, optional avatar).
 * 2. Attempt login with same email/password using /auth/user/login.
 * 3. Validate login succeeds and returns authorized user session and token.
 * 4. Check returned profile matches registration (email/display_name/avatar_url).
 * 5. Check is_locked==false and deleted_at is null/undefined.
 * 6. Confirm access/refresh tokens and their expiry information follow
 *    requirements.
 */
export async function test_api_user_login_with_valid_credentials(
  connection: api.IConnection,
) {
  // 1. Register user with random credentials
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.MinLength<8> & tags.MaxLength<64> =
    typia.random<string & tags.MinLength<8> & tags.MaxLength<64>>();
  const displayName: string & tags.MinLength<1> & tags.MaxLength<100> =
    RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 });
  const avatar: (string & tags.MaxLength<80000> & tags.Format<"uri">) | null =
    Math.random() < 0.5
      ? typia.random<string & tags.MaxLength<80000> & tags.Format<"uri">>()
      : null;

  const registeredUser: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password,
        display_name: displayName,
        avatar_url: avatar,
      } satisfies IDiscussionBoardUser.ICreate,
    });
  typia.assert(registeredUser);

  // 2. Attempt login with registered credentials
  const loginRequest = {
    email,
    password,
    href: "https://test-frontend.app/login",
    referrer: "https://test-frontend.app/",
  } satisfies IDiscussionBoardUser.ILogin;
  const loginResult: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: loginRequest,
    });
  typia.assert(loginResult);

  // 3. Check login returns correct user profile
  TestValidator.equals("user id must match", loginResult.id, registeredUser.id);
  TestValidator.equals("user email must match", loginResult.email, email);
  TestValidator.equals(
    "display name must match",
    loginResult.display_name,
    displayName,
  );
  TestValidator.equals("avatar_url must match", loginResult.avatar_url, avatar);
  TestValidator.equals("is_locked is false", loginResult.is_locked, false);
  TestValidator.equals(
    "deleted_at should be null or undefined",
    loginResult.deleted_at ?? null,
    null,
  );

  // 4. Validate token fields are present
  typia.assert<IAuthorizationToken>(loginResult.token);
  TestValidator.predicate(
    "token.access present",
    typeof loginResult.token.access === "string" &&
      loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh present",
    typeof loginResult.token.refresh === "string" &&
      loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at present",
    typeof loginResult.token.expired_at === "string" &&
      loginResult.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "token.refreshable_until present",
    typeof loginResult.token.refreshable_until === "string" &&
      loginResult.token.refreshable_until.length > 0,
  );
}
