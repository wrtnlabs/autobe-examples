import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModeratorSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModeratorSession";

/**
 * Test retrieving sessions when a newly created moderator has no active
 * sessions (or only the current login session).
 *
 * This test validates that the API correctly returns a paginated response with
 * either an empty data array or only the current session. It verifies
 * pagination metadata shows appropriate records count and pages information,
 * tests the edge case where pagination returns zero total records to ensure
 * proper handling of empty session lists, and confirms the response structure
 * remains consistent even when there are minimal sessions.
 *
 * Test flow:
 *
 * 1. Create a fresh moderator account via join endpoint
 * 2. Retrieve sessions for the newly authenticated moderator
 * 3. Verify the response structure and pagination metadata
 * 4. Validate empty or minimal sessions handling
 */
export async function test_api_moderator_session_retrieval_empty_sessions(
  connection: api.IConnection,
) {
  // Step 1: Create a fresh moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorData = {
    email: moderatorEmail,
    username: RandomGenerator.alphabets(8),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformModerator.ICreate;

  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  TestValidator.equals(
    "moderator email matches created email",
    moderator.email,
    moderatorEmail,
  );
  TestValidator.predicate(
    "moderator account is active",
    moderator.account_status === "active",
  );

  // Step 2: Retrieve sessions for the newly authenticated moderator
  const sessionsPage: IPageICommunityPlatformModeratorSession =
    await api.functional.communityPlatform.moderator.auth.moderator.sessions.index(
      connection,
    );
  typia.assert(sessionsPage);

  // Step 3: Verify response structure and pagination metadata
  TestValidator.predicate(
    "sessions response has pagination object",
    sessionsPage.pagination !== null && sessionsPage.pagination !== undefined,
  );
  TestValidator.predicate(
    "sessions response has data array",
    Array.isArray(sessionsPage.data),
  );

  const pagination = sessionsPage.pagination;
  TestValidator.predicate(
    "pagination current page is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    pagination.pages >= 0,
  );

  // Step 4: Validate empty or minimal sessions handling
  // For a newly created moderator, expect either empty sessions or only current session
  const sessions = sessionsPage.data;
  TestValidator.predicate("sessions data is array", Array.isArray(sessions));

  // Verify pagination consistency
  if (sessions.length > 0) {
    // If there are sessions, verify they have correct structure
    for (const session of sessions) {
      typia.assert(session);
      TestValidator.predicate(
        "session has valid id",
        typeof session.id === "string" && session.id.length > 0,
      );
      TestValidator.predicate(
        "session has href",
        typeof session.href === "string" && session.href.length > 0,
      );
      TestValidator.predicate(
        "session has created_at",
        typeof session.created_at === "string" && session.created_at.length > 0,
      );
      TestValidator.predicate(
        "session has moderator reference",
        session.moderator !== null && session.moderator !== undefined,
      );
    }

    // Verify pagination records matches session count when on first page
    if (pagination.current === 0 && sessions.length < pagination.limit) {
      TestValidator.equals(
        "records count matches session data length",
        pagination.records,
        sessions.length,
      );
    }
  } else {
    // For empty sessions, verify pagination shows zero records
    TestValidator.equals(
      "empty sessions shows zero records",
      pagination.records,
      0,
    );
    TestValidator.equals(
      "empty sessions shows zero pages",
      pagination.pages,
      0,
    );
  }

  // Step 5: Verify pages calculation
  const expectedPages =
    pagination.limit > 0 ? Math.ceil(pagination.records / pagination.limit) : 0;
  TestValidator.equals(
    "pagination pages matches calculated value",
    pagination.pages,
    expectedPages,
  );
}
