import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberSession";

export async function test_api_member_sessions_retrieve_single_session(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account which automatically initializes a session
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const memberPassword = RandomGenerator.alphabets(12);

  const joinResponse: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: memberUsername,
        password: memberPassword,
        ip: "192.168.1.1",
        href: "https://example.com/auth/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(joinResponse);

  // Step 2: Retrieve all active sessions for the authenticated member
  const sessionResponse: IPageICommunityPlatformMemberSession.ISummary =
    await api.functional.communityPlatform.member.auth.member.sessions.index(
      connection,
    );
  typia.assert(sessionResponse);

  // Step 3: Validate the response structure and content
  TestValidator.equals(
    "pagination shows exactly 1 total record",
    sessionResponse.pagination.records,
    1,
  );
  TestValidator.equals(
    "pagination shows exactly 1 page",
    sessionResponse.pagination.pages,
    1,
  );
  TestValidator.predicate(
    "data array contains exactly one session",
    sessionResponse.data.length === 1,
  );

  // Step 4: Validate the session metadata
  const session = sessionResponse.data[0];
  typia.assert<ICommunityPlatformMemberSession.ISummary>(session);

  TestValidator.predicate(
    "session has valid UUID ID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      session.id,
    ),
  );
  TestValidator.equals(
    "session IP address matches creation context",
    session.ip,
    "192.168.1.1",
  );
  TestValidator.equals(
    "session href matches creation context",
    session.href,
    "https://example.com/auth/join",
  );
  TestValidator.equals(
    "session referrer matches creation context",
    session.referrer,
    "https://example.com",
  );
  TestValidator.predicate(
    "session created_at is valid ISO 8601 date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(session.created_at),
  );
  TestValidator.predicate(
    "session is active (expired_at is null or undefined)",
    session.expired_at === null || session.expired_at === undefined,
  );
}
