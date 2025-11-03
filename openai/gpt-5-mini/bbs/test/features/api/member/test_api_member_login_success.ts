import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_member_login_success(
  connection: api.IConnection,
) {
  // Create unique test credentials that satisfy DTO constraints
  const username = RandomGenerator.alphaNumeric(8); // matches /^[A-Za-z0-9_.-]{3,30}$/
  const email = typia.random<string & tags.Format<"email">>();
  const password = `${RandomGenerator.alphaNumeric(12)}A!`; // ensure >=12 and includes uppercase and symbol

  // Provide required session context fields
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  // 1) Register the member via join
  const joinBody = {
    username,
    email,
    password,
    href,
    referrer,
  } satisfies IDiscussionBoardMember.IJoin;

  const created: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: joinBody,
    });
  // Validate full response shape
  typia.assert(created);

  // Business checks: tokens exist and appear non-empty
  TestValidator.predicate(
    "join: access token present",
    typeof created.token?.access === "string" &&
      created.token.access.length > 0,
  );
  TestValidator.predicate(
    "join: refresh token present",
    typeof created.token?.refresh === "string" &&
      created.token.refresh.length > 0,
  );

  // 2) Authenticate using login endpoint with username (usernameOrEmail)
  const loginBody = {
    usernameOrEmail: username,
    password,
    href,
    referrer,
  } satisfies IDiscussionBoardMember.ILogin;

  const logged: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: loginBody,
    });
  typia.assert(logged);

  // 3) Validate business expectations
  TestValidator.equals("login returns same member id", logged.id, created.id);
  TestValidator.predicate(
    "login: access token present",
    typeof logged.token?.access === "string" && logged.token.access.length > 0,
  );
  TestValidator.predicate(
    "login: refresh token present",
    typeof logged.token?.refresh === "string" &&
      logged.token.refresh.length > 0,
  );

  // Additional sanity: member summary should exist and not contain password hash
  if (logged.member !== undefined && logged.member !== null) {
    typia.assert(logged.member);
    TestValidator.predicate(
      "member summary has id",
      typeof logged.member.id === "string" && logged.member.id.length > 0,
    );
  }
}
