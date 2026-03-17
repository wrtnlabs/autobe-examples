import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneMemberSession";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_session_filter_expired_sessions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member account and get authenticated connection
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member1Auth);
  // 2. Create second member account to test session isolation
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member2Auth);
  // 3. Test filtering expired sessions for member1 (edge case: no expired sessions yet)
  const expiredSessionsMember1 =
    await api.functional.redditClone.member.sessions.index(member1Connection, {
      body: {
        expired: true,
        page: 1,
        limit: 20,
        sort: "created_at",
        order: "desc",
      } satisfies IRedditCloneMemberSession.IRequest,
    });
  typia.assert(expiredSessionsMember1);
  // 4. Verify pagination metadata for empty expired sessions
  TestValidator.predicate(
    "records should be 0 when no expired sessions exist",
    expiredSessionsMember1.pagination.records === 0,
  );
  TestValidator.equals(
    "pages should be 0 when no records",
    expiredSessionsMember1.pagination.pages,
    0,
  );
  TestValidator.equals(
    "data should be empty array",
    expiredSessionsMember1.data.length,
    0,
  );
  // 5. Verify all session records include complete metadata (when data exists)
  if (expiredSessionsMember1.data.length > 0) {
    for (const session of expiredSessionsMember1.data) {
      // Verify expired_at is in the past
      const expiredAt = new Date(session.expired_at);
      const now = new Date();
      TestValidator.predicate(
        "expired_at should be in the past",
        expiredAt.getTime() < now.getTime(),
      );
      // Verify complete metadata exists
      TestValidator.predicate(
        "session should have valid IP",
        session.ip.length > 0,
      );
      TestValidator.predicate(
        "session should have valid href",
        session.href.length > 0,
      );
      TestValidator.predicate(
        "session should have valid referrer",
        session.referrer.length > 0,
      );
      TestValidator.predicate(
        "session should have created_at",
        session.created_at.length > 0,
      );
      TestValidator.predicate(
        "session should have expired_at",
        session.expired_at.length > 0,
      );
      TestValidator.predicate(
        "session should have member info",
        session.member !== undefined,
      );
      TestValidator.predicate(
        "member should have username",
        session.member.username.length > 0,
      );
    }
  }
  // 6. Get expired sessions for member2 to verify isolation
  const expiredSessionsMember2 =
    await api.functional.redditClone.member.sessions.index(member2Connection, {
      body: {
        expired: true,
        page: 1,
        limit: 20,
        sort: "created_at",
        order: "desc",
      } satisfies IRedditCloneMemberSession.IRequest,
    });
  typia.assert(expiredSessionsMember2);
  // 7. Verify member isolation - each member should only see their own sessions
  if (
    expiredSessionsMember1.data.length > 0 &&
    expiredSessionsMember2.data.length > 0
  ) {
    const member1Ids = expiredSessionsMember1.data.map((s) => s.id);
    const member2Ids = expiredSessionsMember2.data.map((s) => s.id);
    // Sessions should be different between members
    const anyOverlap = member1Ids.some((id) => member2Ids.includes(id));
    TestValidator.predicate(
      "members should not see each other's sessions",
      !anyOverlap,
    );
  }
  // 8. Verify member info in sessions belongs to correct member
  for (const session of expiredSessionsMember1.data) {
    TestValidator.equals(
      "session member should belong to member1",
      session.member.id,
      member1Auth.id,
    );
  }
  for (const session of expiredSessionsMember2.data) {
    TestValidator.equals(
      "session member should belong to member2",
      session.member.id,
      member2Auth.id,
    );
  }
  // 9. Test active sessions filter (expired: false) to ensure it works differently
  const activeSessionsMember1 =
    await api.functional.redditClone.member.sessions.index(member1Connection, {
      body: {
        expired: false,
        page: 1,
        limit: 20,
        sort: "created_at",
        order: "desc",
      } satisfies IRedditCloneMemberSession.IRequest,
    });
  typia.assert(activeSessionsMember1);
  // Active sessions should exist (at least the current session)
  TestValidator.predicate(
    "should have at least one active session",
    activeSessionsMember1.data.length >= 1,
  );
  // Verify active sessions are not expired
  for (const session of activeSessionsMember1.data) {
    const expiredAt = new Date(session.expired_at);
    const now = new Date();
    TestValidator.predicate(
      "active session expired_at should be in the future",
      expiredAt.getTime() > now.getTime(),
    );
  }
  // 10. Verify pagination metadata structure
  TestValidator.predicate(
    "pagination current should be >= 1",
    expiredSessionsMember1.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit should be > 0",
    expiredSessionsMember1.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records should be >= 0",
    expiredSessionsMember1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be >= 0",
    expiredSessionsMember1.pagination.pages >= 0,
  );
}
