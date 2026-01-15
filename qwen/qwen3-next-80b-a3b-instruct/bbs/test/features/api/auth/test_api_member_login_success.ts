import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a valid member account using join endpoint
  const joinCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: `https://example.com/join?source=${RandomGenerator.alphaNumeric(12)}`,
    referrer: `https://example.com/referrer?source=${RandomGenerator.alphaNumeric(12)}`,
  } satisfies IDiscussionBoardUser.IJoin;
  const memberConnection: api.IConnection = { host: connection.host };
  const registeredMember = await authorize_member_join(memberConnection, {
    body: joinCredentials,
  });
  typia.assert(registeredMember);
  // Step 2: Test successful login with the created member's credentials
  const loginCredentials = {
    email: joinCredentials.email,
    password: joinCredentials.password,
    href: `https://example.com/login?source=${RandomGenerator.alphaNumeric(12)}`,
    referrer: `https://example.com/referrer?source=${RandomGenerator.alphaNumeric(12)}`,
  } satisfies IDiscussionBoardUser.ILogin;
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedInMember = await authorize_member_login(loginConnection, {
    body: loginCredentials,
  });
  typia.assert(loggedInMember);
  // Step 3: Validate the login response structure
  TestValidator.equals(
    "member ID matches",
    loggedInMember.id,
    registeredMember.id,
  );
  TestValidator.equals("display name matches", loggedInMember.displayName, "");
  TestValidator.equals(
    "email verified status matches",
    loggedInMember.emailVerified,
    false,
  ); // Join creates unverified account
  TestValidator.equals(
    "creation date matches",
    loggedInMember.createdAt,
    registeredMember.createdAt,
  );
  // Validate token structure
  TestValidator.equals(
    "access token exists",
    loggedInMember.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh token exists",
    loggedInMember.token.refresh.length > 0,
    true,
  );
  TestValidator.predicate(
    "access token expired_at is valid date-time format",
    () => {
      return !isNaN(Date.parse(loggedInMember.token.expired_at));
    },
  );
  TestValidator.predicate(
    "refresh token refreshable_until is valid date-time format",
    () => {
      return !isNaN(Date.parse(loggedInMember.token.refreshable_until));
    },
  );
}
