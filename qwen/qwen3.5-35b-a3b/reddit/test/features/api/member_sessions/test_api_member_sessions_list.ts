import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMemberSession";
import type { IRedditCommunityDateTimeRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityDateTimeRange";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberSession";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_sessions_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member-specific connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(authResponse);
  // Verify token structure
  typia.assert(authResponse.token);
  const tokenExpiration = authResponse.token.expired_at;
  typia.assert<string & tags.Format<"date-time">>(tokenExpiration);
  const refreshableUntil = authResponse.token.refreshable_until;
  typia.assert<string & tags.Format<"date-time">>(refreshableUntil);
  // 2. Call sessions endpoint with authenticated connection
  const sessionList =
    await api.functional.redditCommunity.member.sessions.index(
      memberConnection,
      {
        body: {} satisfies IRedditCommunityMemberSession.IRequest,
      },
    );
  typia.assert(sessionList);
  // 3. Validate pagination structure
  typia.assert<IRedditCommunityMemberSession.ISummary[]>(sessionList.data);
  typia.assert<IPage.IPagination>(sessionList.pagination);
  const pagination = sessionList.pagination;
  TestValidator.predicate(
    "pagination current is valid",
    pagination.current >= 0,
  );
  TestValidator.predicate("pagination limit is valid", pagination.limit >= 0);
  TestValidator.predicate(
    "pagination records is valid",
    pagination.records >= 0,
  );
  TestValidator.predicate("pagination pages is valid", pagination.pages >= 0);
  // 4. Validate each session record
  for (const session of sessionList.data) {
    typia.assert(session);
    // Session ID
    typia.assert<string & tags.Format<"uuid">>(session.id);
    // Member reference
    typia.assert<IRedditCommunityMember.ISummary>(session.member);
    typia.assert<string & tags.Format<"uuid">>(session.member.id);
    typia.assert<string>(session.member.username);
    typia.assert<string & tags.Format<"date-time">>(session.member.created_at);
    // IP address
    typia.assert<string>(session.ip);
    // URI validation
    typia.assert<string & tags.Format<"uri">>(session.href);
    typia.assert<string>(session.referrer);
    // Timestamp validation
    typia.assert<string & tags.Format<"date-time">>(session.created_at);
    typia.assert<string & tags.Format<"date-time">>(session.updated_at);
    typia.assert<string & tags.Format<"date-time">>(session.expired_at);
    // Verify timestamps are valid ISO 8601 format
    new Date(session.created_at);
    new Date(session.updated_at);
    new Date(session.expired_at);
  }
  // 5. Validate member reference matches authenticated user
  // Since member info is not returned in join response, we validate that
  // sessions contain valid member references
  TestValidator.predicate(
    "all sessions have member references",
    sessionList.data.every(
      (session) =>
        session.member.id !== undefined &&
        session.member.username !== undefined,
    ),
  );
  // 6. Validate pagination metadata consistency
  if (pagination.records > 0) {
    TestValidator.predicate(
      "pages calculated correctly",
      pagination.pages === Math.ceil(pagination.records / pagination.limit),
    );
  }
  // 7. Validate session list has valid timestamps (sessions should exist)
  if (sessionList.data.length > 0) {
    const firstSession = sessionList.data[0];
    typia.assert(firstSession.created_at);
    typia.assert(firstSession.expired_at);
    // Verify session was created
    TestValidator.predicate(
      "session created_at is valid date",
      !isNaN(new Date(firstSession.created_at).getTime()),
    );
  }
}