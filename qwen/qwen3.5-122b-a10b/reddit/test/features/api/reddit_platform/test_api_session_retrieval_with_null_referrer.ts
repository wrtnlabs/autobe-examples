import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_session_retrieval_with_null_referrer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member with valid session data
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(
        typia.random<string & tags.Format<"email">>(),
      ),
      password: typia.assert<string & tags.MinLength<8> & tags.MaxLength<128>>(
        RandomGenerator.alphaNumeric(16),
      ),
      username: typia.assert<string & tags.MinLength<1> & tags.MaxLength<50>>(
        RandomGenerator.name(1),
      ),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(auth);
  // 2. Retrieve session details using the session ID from auth token
  const session: IRedditPlatformMemberSession.ISummary =
    await api.functional.redditPlatform.member.sessions.at(memberConnection, {
      sessionId: auth.token.access,
    });
  typia.assert(session);
  // 3. Validate session metadata
  TestValidator.equals("session ID is valid UUID", session.id, session.id);
  TestValidator.predicate(
    "has valid IP format",
    /^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/.test(session.ip),
  );
  TestValidator.predicate("href is valid URI", session.href.length > 0);
  TestValidator.predicate(
    "referrer is valid URI or null",
    session.referrer === null || session.referrer.length > 0,
  );
  TestValidator.predicate(
    "has created timestamp",
    session.created_at.length > 0,
  );
  TestValidator.predicate(
    "has expiration timestamp",
    session.expired_at.length > 0,
  );
  // 4. Validate member summary
  TestValidator.predicate(
    "member has valid UUID",
    session.member.id.length > 0,
  );
  TestValidator.equals(
    "member username matches",
    session.member.username,
    auth.username,
  );
  TestValidator.predicate(
    "member has karma score",
    typeof session.member.karma_score === "number",
  );
  TestValidator.predicate(
    "member has created timestamp",
    session.member.created_at.length > 0,
  );
}