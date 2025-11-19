import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_member_login_existing(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "safePassword123",
    nickname: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberJoinBody });
  typia.assert(member);

  // Step 2: Login with the same member's credentials
  const memberLoginBody = {
    email: memberJoinBody.email,
    password: memberJoinBody.password,
    href: "https://example.com/login",
    referrer: "https://example.com/",
    ip: null,
  } satisfies IDiscussionBoardMember.ILogin;

  const login: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(login);

  // Step 3: Validate returned member info and tokens
  TestValidator.predicate(
    "login member id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      login.id,
    ),
  );

  TestValidator.predicate(
    "access token is non-empty",
    login.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    login.token.refresh.length > 0,
  );

  // Step 4: Verify that login member id equals join member id
  TestValidator.equals(
    "login member id equals join member id",
    login.id,
    member.id,
  );
}
