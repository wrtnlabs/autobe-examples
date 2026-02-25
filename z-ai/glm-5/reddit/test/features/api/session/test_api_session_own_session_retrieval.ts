import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_session_own_session_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: `Password${RandomGenerator.alphaNumeric(6)}1!`,
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: "https://example.com/test-page",
      referrer: "https://example.com/",
      ip: "192.168.1.1",
    } satisfies ICommunityMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Extract sessionId from JWT access token payload
  const tokenParts = authorized.accessToken.split(".");
  const payload = JSON.parse(
    atob(tokenParts[1].replace(/-/g, "+").replace(/_/g, "/")),
  );
  const sessionId = payload.session_id ?? payload.sid ?? authorized.id;
  // 3. Retrieve session details
  const session = await api.functional.community.member.sessions.at(
    memberConnection,
    { sessionId },
  );
  typia.assert(session);
  // 4. Verify session fields
  TestValidator.equals("session id matches", session.id, sessionId);
  TestValidator.equals("member id matches", session.member.id, authorized.id);
  TestValidator.equals(
    "member username matches",
    session.member.username,
    authorized.username,
  );
  TestValidator.equals(
    "href matches",
    session.href,
    "https://example.com/test-page",
  );
  TestValidator.equals("ip matches", session.ip, "192.168.1.1");
  // 5. Verify token expiration timing (access: 30 min, refresh: 14 days)
  const accessExpiresAtTime = new Date(session.accessExpiresAt).getTime();
  const refreshExpiresAtTime = new Date(session.refreshExpiresAt).getTime();
  const createdAtTime = new Date(session.createdAt).getTime();
  const thirtyMinutesInMs = 30 * 60 * 1000;
  const fourteenDaysInMs = 14 * 24 * 60 * 60 * 1000;
  TestValidator.predicate(
    "access expires at approximately 30 minutes from creation",
    Math.abs(accessExpiresAtTime - createdAtTime - thirtyMinutesInMs) < 60000,
  );
  TestValidator.predicate(
    "refresh expires at approximately 14 days from creation",
    Math.abs(refreshExpiresAtTime - createdAtTime - fourteenDaysInMs) < 60000,
  );
  TestValidator.equals(
    "expiredAt matches refreshExpiresAt",
    session.expiredAt,
    session.refreshExpiresAt,
  );
  // 6. Verify security: JWT token strings should NOT be exposed
  const sessionAny = session as Record<string, unknown>;
  TestValidator.predicate(
    "access token not exposed",
    sessionAny.access_token === undefined &&
      sessionAny.accessToken === undefined,
  );
  TestValidator.predicate(
    "refresh token not exposed",
    sessionAny.refresh_token === undefined &&
      sessionAny.refreshToken === undefined,
  );
}
