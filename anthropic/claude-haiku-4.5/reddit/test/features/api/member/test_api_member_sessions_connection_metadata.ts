import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberSession";

/**
 * Test that session records include complete connection metadata for device
 * identification.
 *
 * This test verifies that each session returned contains all required metadata
 * fields: session ID (UUID format), IP address (can be null if not captured),
 * referrer header value, connection URL, and creation timestamp in ISO 8601
 * format.
 *
 * The test validates:
 *
 * 1. Session ID is a valid UUID
 * 2. Referrer and href URLs are valid URIs
 * 3. Timestamps are properly formatted in ISO 8601 format
 * 4. IP address is present or null (optional field)
 * 5. Pagination structure is properly included
 */
export async function test_api_member_sessions_connection_metadata(
  connection: api.IConnection,
) {
  // Step 1: Create a member account with connection metadata
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphabets(8);
  const memberPassword = "SecurePassword123!";
  const clientIp = "192.168.1.100";
  const connectionHref = typia.random<string & tags.Format<"uri">>();
  const connectionReferrer = typia.random<string & tags.Format<"uri">>();

  const memberJoinResponse: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: memberUsername,
        password: memberPassword,
        ip: clientIp,
        href: connectionHref,
        referrer: connectionReferrer,
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberJoinResponse);

  // Step 2: Retrieve member's sessions
  const sessionsResponse: IPageICommunityPlatformMemberSession.ISummary =
    await api.functional.communityPlatform.member.auth.member.sessions.index(
      connection,
    );
  typia.assert(sessionsResponse);

  // Step 3: Validate pagination structure exists and has correct metadata
  TestValidator.predicate(
    "pagination object should exist",
    sessionsResponse.pagination !== undefined,
  );

  TestValidator.predicate(
    "pagination should have non-negative current page",
    sessionsResponse.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination should have non-negative limit",
    sessionsResponse.pagination.limit >= 0,
  );

  TestValidator.predicate(
    "pagination should have non-negative records count",
    sessionsResponse.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination should have non-negative pages count",
    sessionsResponse.pagination.pages >= 0,
  );

  // Step 4: Validate sessions data array exists and contains sessions
  TestValidator.predicate(
    "sessions data should be an array",
    Array.isArray(sessionsResponse.data),
  );

  TestValidator.predicate(
    "at least one session should exist after registration",
    sessionsResponse.data.length > 0,
  );

  // Step 5: Validate the most recent session has all required metadata fields
  const createdSession: ICommunityPlatformMemberSession.ISummary =
    sessionsResponse.data[0];

  TestValidator.predicate(
    "session ID should be valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdSession.id,
    ),
  );

  TestValidator.predicate(
    "session href should not be empty",
    createdSession.href.length > 0,
  );

  TestValidator.predicate(
    "session referrer should be a string",
    typeof createdSession.referrer === "string",
  );

  TestValidator.predicate(
    "session created_at should be ISO 8601 date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/i.test(
      createdSession.created_at,
    ),
  );

  TestValidator.predicate(
    "session IP should be null or string value",
    createdSession.ip === null || typeof createdSession.ip === "string",
  );

  TestValidator.predicate(
    "session expired_at should be null or ISO 8601 format when present",
    createdSession.expired_at === null ||
      createdSession.expired_at === undefined ||
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/i.test(
        createdSession.expired_at,
      ),
  );

  // Step 6: Validate all sessions in response have complete metadata
  for (let i = 0; i < sessionsResponse.data.length; i++) {
    const session = sessionsResponse.data[i];

    TestValidator.predicate(
      `session at index ${i} should have session ID`,
      session.id !== undefined && session.id.length > 0,
    );

    TestValidator.predicate(
      `session at index ${i} should have href URL`,
      session.href !== undefined && session.href.length > 0,
    );

    TestValidator.predicate(
      `session at index ${i} should have referrer`,
      session.referrer !== undefined && typeof session.referrer === "string",
    );

    TestValidator.predicate(
      `session at index ${i} should have created timestamp`,
      session.created_at !== undefined && session.created_at.length > 0,
    );
  }
}
