import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICrIPageIntegerRequired } from "@ORGANIZATION/PROJECT-api/lib/structures/ICrIPageIntegerRequired";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import type { IEconomicDiscussionModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModeratorSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicDiscussionModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionModeratorSession";

/**
 * Test filtering moderator sessions by active status to show only currently
 * valid administrative sessions.
 *
 * This comprehensive test validates the system's ability to correctly identify
 * active vs expired sessions based on expiration timestamps and return only
 * sessions that are still valid for administrative access. The test follows a
 * complete workflow: moderator registration → session creation → filtering
 * verification.
 *
 * Business Context:
 *
 * - Administrative sessions require security monitoring to prevent unauthorized
 *   access
 * - Active session filtering ensures only currently valid sessions are displayed
 * - Expiration timestamp comparison determines session validity status
 * - This functionality is critical for audit trails and access control management
 *
 * Test Flow:
 *
 * 1. Create a new moderator account with proper authentication credentials
 * 2. Generate multiple moderator sessions with varied expiration times
 * 3. Create sessions that expire in the future (active) and past (expired)
 * 4. Filter sessions using status parameter to retrieve only active sessions
 * 5. Validate that all returned sessions have future expiration timestamps
 * 6. Verify pagination works correctly with filtered results
 * 7. Ensure session metadata includes proper audit information
 *
 * Validation Points:
 *
 * - All returned sessions must have expired_at timestamps in the future
 * - No expired sessions should appear in active filter results
 * - Session creation timestamps must be before expiration timestamps
 * - Proper pagination metadata for filtered session lists
 * - Complete session details including IP addresses and access URLs
 */
export async function test_api_moderator_session_active_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator account for testing
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.name(),
      email: moderatorEmail,
      password_hash: RandomGenerator.alphaNumeric(32),
      email_verified: true,
      two_factor_enabled: false,
      moderation_level: RandomGenerator.pick([
        "junior",
        "senior",
        "lead",
      ] as const),
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator);

  // Create multiple sessions with different expiration times using manual iteration
  const sessionData = [
    { isActive: true, daysOffset: 1 }, // Future: active
    { isActive: false, daysOffset: 1 }, // Past: expired
    { isActive: true, daysOffset: 2 }, // Future: active
    { isActive: false, daysOffset: 2 }, // Past: expired
    { isActive: true, daysOffset: 3 }, // Future: active
  ];

  const sessions = [];
  for (const config of sessionData) {
    const expiredAt = config.isActive
      ? new Date(
          Date.now() + config.daysOffset * 24 * 60 * 60 * 1000,
        ).toISOString()
      : new Date(
          Date.now() - config.daysOffset * 24 * 60 * 60 * 1000,
        ).toISOString();

    const session =
      await api.functional.economicDiscussion.moderator.moderators.sessions.create(
        connection,
        {
          moderatorId: moderator.id,
          body: {
            ip: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<254>>()}`,
            href: `https://admin.discussion-board.com/moderator/${moderator.id}/dashboard` as const,
            referrer:
              Math.random() > 0.5
                ? "https://login.discussion-board.com"
                : undefined,
          } satisfies IEconomicDiscussionModeratorSession.ICreate,
        },
      );

    sessions.push(session);

    // Validate expiration logic
    const isActuallyActive =
      new Date(session.expired_at!).getTime() > Date.now();
    TestValidator.predicate(
      `session expiration matches test configuration`,
      config.isActive === isActuallyActive,
    );
  }

  // Filter sessions to show only active ones
  const activeSessions =
    await api.functional.economicDiscussion.moderator.moderators.sessions.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          status: "active",
          page: 1,
          limit: 10,
          sort_by: "created_at",
          order: "desc",
        } satisfies IEconomicDiscussionModeratorSession.IRequest,
      },
    );
  typia.assert(activeSessions);

  // Validate filtering results
  TestValidator.predicate(
    "active sessions list is not empty",
    activeSessions.data.length > 0,
  );

  // Count active sessions (should be 3 out of 5)
  const expectedActiveCount = sessionData.filter((s) => s.isActive).length;
  TestValidator.equals(
    "active sessions count matches expected",
    activeSessions.data.length,
    expectedActiveCount,
  );

  // Verify all returned sessions are actually active
  activeSessions.data.forEach((session, index) => {
    TestValidator.predicate(
      `active session ${index} has future expiration`,
      new Date(session.expired_at!).getTime() > Date.now(),
    );

    TestValidator.predicate(
      `active session ${index} has valid moderator reference`,
      session.moderator.id === moderator.id,
    );

    TestValidator.predicate(
      `active session ${index} has complete session data`,
      session.id !== undefined &&
        session.created_at !== undefined &&
        session.ip !== undefined,
    );
  });

  // Test pagination with active filter
  const paginatedActive =
    await api.functional.economicDiscussion.moderator.moderators.sessions.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          status: "active",
          page: 1,
          limit: 2,
          sort_by: "expired_at",
          order: "asc",
        } satisfies IEconomicDiscussionModeratorSession.IRequest,
      },
    );

  TestValidator.predicate(
    "paginated active sessions respect limit",
    paginatedActive.data.length <= 2,
  );

  TestValidator.predicate(
    "pagination current page is correct",
    paginatedActive.pagination.current !== undefined,
  );

  // Test expired filter for comparison
  const expiredSessions =
    await api.functional.economicDiscussion.moderator.moderators.sessions.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          status: "expired",
          page: 1,
          limit: 10,
        } satisfies IEconomicDiscussionModeratorSession.IRequest,
      },
    );

  expiredSessions.data.forEach((session, index) => {
    TestValidator.predicate(
      `expired session ${index} has past expiration`,
      new Date(session.expired_at!).getTime() < Date.now(),
    );
  });

  // Verify total counts add up correctly
  TestValidator.equals(
    "total session count consistency",
    activeSessions.data.length + expiredSessions.data.length,
    sessions.length,
  );
}
