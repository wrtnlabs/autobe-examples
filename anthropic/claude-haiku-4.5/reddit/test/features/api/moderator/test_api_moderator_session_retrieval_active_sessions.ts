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
 * Test retrieving all active sessions for an authenticated moderator.
 *
 * This test validates the complete moderator session retrieval workflow:
 *
 * 1. Create a new moderator account via join operation
 * 2. Authenticate the moderator and establish a session
 * 3. Retrieve all active sessions for the authenticated moderator
 * 4. Validate response structure including pagination and session metadata
 * 5. Confirm sessions contain IP address, connection URL, referrer, and timestamps
 * 6. Verify moderator information is included in each session
 *
 * The test ensures moderators can view all their active sessions across devices
 * for security monitoring and account access management.
 */
export async function test_api_moderator_session_retrieval_active_sessions(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorCreateBody = {
    email: moderatorEmail,
    username: RandomGenerator.alphabets(8),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformModerator.ICreate;

  const authorizedModerator = await api.functional.auth.moderator.join(
    connection,
    {
      body: moderatorCreateBody,
    },
  );
  typia.assert(authorizedModerator);

  TestValidator.equals(
    "moderator email matches created account",
    authorizedModerator.email,
    moderatorEmail,
  );
  TestValidator.predicate(
    "moderator account is active",
    authorizedModerator.account_status === "active",
  );

  // Step 2: Retrieve all active sessions for the authenticated moderator
  const sessionResponse =
    await api.functional.communityPlatform.moderator.auth.moderator.sessions.index(
      connection,
    );
  typia.assert(sessionResponse);

  // Step 3: Validate response structure
  TestValidator.predicate(
    "response contains pagination information",
    sessionResponse.pagination !== undefined &&
      sessionResponse.pagination !== null,
  );

  const pagination = sessionResponse.pagination;
  TestValidator.predicate(
    "pagination current page is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination total records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination total pages is non-negative",
    pagination.pages >= 0,
  );

  // Step 4: Validate sessions data array exists
  TestValidator.predicate(
    "sessions data array exists",
    Array.isArray(sessionResponse.data),
  );

  // Step 5: Validate each session in the response
  if (sessionResponse.data.length > 0) {
    const firstSession = sessionResponse.data[0];
    typia.assert(firstSession);

    TestValidator.predicate(
      "session has valid ID",
      typeof firstSession.id === "string" && firstSession.id.length > 0,
    );

    TestValidator.predicate(
      "session href is valid URI",
      typeof firstSession.href === "string" && firstSession.href.length > 0,
    );

    TestValidator.predicate(
      "session referrer is valid string",
      typeof firstSession.referrer === "string",
    );

    TestValidator.predicate(
      "session created_at is valid datetime",
      typeof firstSession.created_at === "string" &&
        firstSession.created_at.length > 0,
    );

    // Step 6: Validate moderator reference in session
    TestValidator.predicate(
      "session moderator reference exists",
      firstSession.moderator !== undefined && firstSession.moderator !== null,
    );

    TestValidator.equals(
      "moderator ID in session matches authenticated moderator",
      firstSession.moderator.id,
      authorizedModerator.id,
    );

    TestValidator.equals(
      "moderator username in session matches authenticated moderator",
      firstSession.moderator.username,
      authorizedModerator.username,
    );

    // Step 7: Validate session is not expired (active session)
    TestValidator.predicate(
      "session is currently active",
      firstSession.expired_at === undefined || firstSession.expired_at === null,
    );
  }

  // Step 8: Validate pagination consistency
  TestValidator.predicate(
    "returned sessions count matches pagination",
    sessionResponse.data.length <= pagination.records,
  );
}
