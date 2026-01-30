import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_login_successful(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new member account with active status and verified email
  const memberConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
  } satisfies ICommunityBbsMember.IJoin;
  const member: ICommunityBbsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    { body: joinInput },
  );
  typia.assert(member);
  // Step 2: Ensure member account has active status and verified email
  TestValidator.equals("member status is active", member.status, "active");
  TestValidator.predicate(
    "email is verified",
    member.account_verified === true,
  );
  // Step 3: Create a new connection for login with the same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginInput = {
    email: joinInput.email,
    password: joinInput.password,
  } satisfies ICommunityBbsMember.ILogin;
  const loginOutput: ICommunityBbsMember.IAuthorized =
    await authorize_member_login(loginConnection, { body: loginInput });
  typia.assert(loginOutput);
  // Step 4: Validate the login response contains correct member information
  TestValidator.equals("member_id matches", loginOutput.id, member.id);
  TestValidator.equals("email matches", loginOutput.email, member.email);
  TestValidator.equals(
    "display_name matches",
    loginOutput.display_name,
    member.display_name,
  );
  TestValidator.equals("status is active", loginOutput.status, "active");
  TestValidator.equals(
    "karma_score matches",
    loginOutput.karma_score,
    member.karma_score,
  );
  TestValidator.equals(
    "account_verified is true",
    loginOutput.account_verified,
    true,
  );
  TestValidator.equals(
    "created_at matches",
    loginOutput.created_at,
    member.created_at,
  );
  TestValidator.equals(
    "member_duration_days matches",
    loginOutput.member_duration_days,
    member.member_duration_days,
  );
  TestValidator.equals(
    "recent_activity_score matches",
    loginOutput.recent_activity_score,
    member.recent_activity_score,
  );
  // Step 5: Validate token structure and expiration timestamps
  const token = loginOutput.token;
  TestValidator.equals("access token exists", typeof token.access, "string");
  TestValidator.equals("refresh token exists", typeof token.refresh, "string");
  TestValidator.predicate(
    "access token expired_at is ISO date-time",
    new Date(token.expired_at).toString() !== "Invalid Date",
  );
  TestValidator.predicate(
    "refreshable_until is ISO date-time",
    new Date(token.refreshable_until).toString() !== "Invalid Date",
  );
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    new Date(token.refreshable_until) > new Date(token.expired_at),
  );
}
