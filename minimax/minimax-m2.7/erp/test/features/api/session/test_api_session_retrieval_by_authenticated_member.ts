import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_session_retrieval_by_authenticated_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member via join
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Login to create a session and obtain JWT tokens
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_member_login(loginConnection, {
    body: {
      email: authorized.email,
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(loginResponse);
  // 3. Generate a session ID for retrieval
  // Note: The login creates a session, but we use a generated UUID for the test
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  // 4. Retrieve session using the SDK function
  const session = await api.functional.erpHrm.member.sessions.at(
    loginConnection,
    {
      sessionId: sessionId,
    },
  );
  typia.assert(session);
  // 5. Validate session has all required fields
  TestValidator.predicate(
    "session has id as UUID",
    /^\S{8}-\S{4}-\S{4}-\S{4}-\S{12}$/.test(session.id),
  );
  TestValidator.predicate(
    "session has ip address",
    typeof session.ip === "string" && session.ip.length > 0,
  );
  TestValidator.predicate(
    "session has href URL",
    typeof session.href === "string" && session.href.length > 0,
  );
  TestValidator.predicate(
    "session has referrer URL",
    typeof session.referrer === "string" && session.referrer.length > 0,
  );
  TestValidator.predicate(
    "session has tokenExpiredAt as date-time",
    typeof session.tokenExpiredAt === "string" &&
      !isNaN(Date.parse(session.tokenExpiredAt)),
  );
  TestValidator.predicate(
    "session has createdAt as date-time",
    typeof session.createdAt === "string" &&
      !isNaN(Date.parse(session.createdAt)),
  );
  TestValidator.predicate(
    "session has expiredAt as date-time",
    typeof session.expiredAt === "string" &&
      !isNaN(Date.parse(session.expiredAt)),
  );
  // 6. Validate embedded member object structure (IErpHrmMember.ISummary)
  TestValidator.predicate(
    "member object is embedded",
    session.member !== undefined && session.member !== null,
  );
  TestValidator.predicate(
    "member has id as UUID",
    /^\S{8}-\S{4}-\S{4}-\S{4}-\S{12}$/.test(session.member.id),
  );
  TestValidator.predicate(
    "member has email",
    typeof session.member.email === "string" &&
      session.member.email.includes("@"),
  );
  TestValidator.predicate(
    "member has displayName",
    typeof session.member.displayName === "string" &&
      session.member.displayName.length > 0,
  );
  TestValidator.predicate(
    "member has createdAt as date-time",
    typeof session.member.createdAt === "string" &&
      !isNaN(Date.parse(session.member.createdAt)),
  );
  // 7. Security validation - JWT tokens should NOT be exposed in session response
  TestValidator.equals(
    "access_token not in response",
    "access_token" in session,
    false,
  );
  TestValidator.equals(
    "refresh_token not in response",
    "refresh_token" in session,
    false,
  );
  TestValidator.equals("token not in response", "token" in session, false);
}
