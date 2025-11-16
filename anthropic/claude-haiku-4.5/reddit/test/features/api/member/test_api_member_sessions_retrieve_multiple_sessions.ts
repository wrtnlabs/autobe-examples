import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberSession";

export async function test_api_member_sessions_retrieve_multiple_sessions(
  connection: api.IConnection,
) {
  // Step 1: Create initial member account with first session
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "Password123!@#";
  const firstJoin = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(8),
      password: memberPassword,
      ip: "192.168.1.100",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(firstJoin);

  // Step 2: Create second session by logging in with same credentials
  const secondLogin = await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      ip: "192.168.1.101",
      href: "https://example.com/login",
      referrer: "https://google.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });
  typia.assert(secondLogin);

  // Step 3: Create third session by logging in again
  const thirdLogin = await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      ip: "192.168.1.102",
      href: "https://example.com/login",
      referrer: "https://facebook.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });
  typia.assert(thirdLogin);

  // Step 4: Retrieve all sessions for the member
  const sessionsResponse =
    await api.functional.communityPlatform.member.auth.member.sessions.index(
      connection,
    );
  typia.assert(sessionsResponse);

  // Step 5: Validate pagination information
  TestValidator.predicate(
    "pagination should have current page",
    sessionsResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination should have positive limit",
    sessionsResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination should show total records",
    sessionsResponse.pagination.records >= 3,
  );
  TestValidator.predicate(
    "pagination should have pages calculated correctly",
    sessionsResponse.pagination.pages > 0,
  );

  // Step 6: Validate that we have at least 3 sessions
  TestValidator.predicate(
    "should have at least 3 sessions",
    sessionsResponse.data.length >= 3,
  );

  // Step 7: Validate each session has required fields and unique IDs
  const sessionIds = new Set<string>();
  const createdAts = new Set<string>();

  for (const session of sessionsResponse.data) {
    // Check required fields exist
    TestValidator.predicate(
      "session should have ID",
      session.id !== undefined && session.id.length > 0,
    );
    TestValidator.predicate(
      "session should have href",
      session.href !== undefined && session.href.length > 0,
    );
    TestValidator.predicate(
      "session should have created_at",
      session.created_at !== undefined && session.created_at.length > 0,
    );

    // Collect IDs and timestamps for uniqueness check
    sessionIds.add(session.id);
    createdAts.add(session.created_at);
  }

  // Step 8: Verify session uniqueness
  TestValidator.equals(
    "all sessions should have unique IDs",
    sessionIds.size,
    Math.min(3, sessionsResponse.data.length),
  );

  TestValidator.predicate(
    "sessions should have distinct creation timestamps",
    createdAts.size >= 2,
  );

  // Step 9: Validate no sessions are expired (expired_at should be null/undefined for active sessions)
  for (const session of sessionsResponse.data.slice(0, 3)) {
    TestValidator.predicate(
      "active sessions should not have expired_at set",
      session.expired_at === null || session.expired_at === undefined,
    );
  }
}
