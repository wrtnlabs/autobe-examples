import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: A member successfully logs in after creating an account via /auth/member/join.
  // The system validates the provided email and password against the stored bcrypt hash,
  // issues fresh access and refresh tokens, and returns the member's IAuthorized response
  // with a valid JWT structure. This tests the complete authentication workflow for a legitimate user.
  // Step 1: Create a new member account using the authorized utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const joinCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IRedditCommunityMember.IJoin;
  const joinedMember = await authorize_member_join(memberConnection, {
    body: joinCredentials,
  });
  typia.assert(joinedMember);
  // Step 2: Login with the credentials created in step 1
  const loginConnection: api.IConnection = { host: connection.host };
  const loginCredentials = {
    email: joinCredentials.email,
    password: joinCredentials.password,
  } satisfies IRedditCommunityMember.ILogin;
  const loggedinMember = await authorize_member_login(loginConnection, {
    body: loginCredentials,
  });
  typia.assert(loggedinMember);
  // Step 3: Validate the returned IAuthorized structure
  TestValidator.equals("member ID matches", joinedMember.id, loggedinMember.id);
  TestValidator.predicate(
    "access token exists",
    () => loggedinMember.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    () => loggedinMember.token.refresh.length > 0,
  );
  TestValidator.predicate("expired_at is valid ISO date-time", () => {
    const date = new Date(loggedinMember.token.expired_at);
    return (
      !isNaN(date.getTime()) &&
      date.toISOString() === loggedinMember.token.expired_at
    );
  });
  TestValidator.predicate("refreshable_until is valid ISO date-time", () => {
    const date = new Date(loggedinMember.token.refreshable_until);
    return (
      !isNaN(date.getTime()) &&
      date.toISOString() === loggedinMember.token.refreshable_until
    );
  });
}
