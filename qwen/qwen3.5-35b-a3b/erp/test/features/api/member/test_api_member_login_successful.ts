import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with randomized credentials
  const joinConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    org_name: RandomGenerator.name(),
    org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
    org_description: RandomGenerator.paragraph(),
    org_logo_uri: typia.random<string & tags.Format<"uri">>(),
    org_timezone: RandomGenerator.pick([
      "UTC",
      "Asia/Seoul",
      "America/New_York",
    ]),
    org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmPlatformMember.IJoin;
  const joinResult = await authorize_member_join(joinConnection, {
    body: joinInput,
  });
  typia.assert(joinResult);
  const memberEmail = joinInput.email;
  const memberPassword = joinInput.password;
  // 2. Login with the created member credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_member_login(loginConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IHrmPlatformMember.ILogin,
  });
  typia.assert(loginResult);
  // 3. Validate member summary structure
  const member = loginResult.member;
  typia.assert(member);
  TestValidator.equals("member email matches", member.email, memberEmail);
  TestValidator.equals(
    "member name matches",
    member.display_name,
    joinInput.name,
  );
  TestValidator.equals(
    "member phone matches",
    member.phone_number,
    joinInput.phone_number,
  );
  TestValidator.predicate("member is active", member.is_active === true);
  TestValidator.equals("member id matches", member.id, loginResult.id);
  // 4. Validate authorization token structure
  const token = loginResult.token;
  typia.assert(token);
  TestValidator.predicate("access token is not empty", token.access.length > 0);
  TestValidator.predicate(
    "refresh token is not empty",
    token.refresh.length > 0,
  );
  TestValidator.predicate("expired_at is set", token.expired_at !== undefined);
  TestValidator.predicate(
    "refreshable_until is set",
    token.refreshable_until !== undefined,
  );
  // 5. Validate timestamp logic (expired_at in the future)
  const now = new Date();
  const expiredAt = new Date(token.expired_at);
  const refreshableUntil = new Date(token.refreshable_until);
  TestValidator.predicate("expired_at is in the future", expiredAt > now);
  TestValidator.predicate(
    "refreshable_until extends beyond expired_at",
    refreshableUntil > expiredAt,
  );
  // 6. Validate session record creation
  if (loginResult.sessions !== undefined && loginResult.sessions.length > 0) {
    const session = loginResult.sessions[0];
    typia.assert(session);
    TestValidator.predicate("session has valid id", session.id.length > 0);
    TestValidator.predicate(
      "session has ip address",
      session.ip_address.length > 0,
    );
    TestValidator.predicate(
      "session has user agent",
      session.user_agent.length > 0,
    );
    TestValidator.predicate(
      "session has created_at",
      session.created_at !== undefined,
    );
    TestValidator.predicate(
      "session has expired_at (nullable)",
      session.expired_at === null,
    );
  }
  // 7. Verify session was created (not empty array after fresh login)
  TestValidator.predicate(
    "session list not empty",
    loginResult.sessions !== undefined,
  );
  if (loginResult.sessions !== undefined && loginResult.sessions.length > 0) {
    TestValidator.notEquals(
      "new session added",
      0,
      loginResult.sessions.length,
    );
  }
}
