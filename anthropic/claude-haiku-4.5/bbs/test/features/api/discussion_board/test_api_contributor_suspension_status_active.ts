import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSuspension";

/**
 * Test that newly created suspension has status='active' in the response.
 *
 * Validates that a suspension record created through the moderator API
 * immediately returns with status='active', indicating that enforcement begins
 * without delay. This test ensures that when a moderator suspends a
 * contributor, the system immediately enforces the restrictions and the
 * response reflects the active enforcement state.
 *
 * Workflow:
 *
 * 1. Moderator authentication - Register and authenticate as a moderator
 * 2. Generate contributor ID - Create a valid UUID for the target contributor
 * 3. Create suspension - Issue a suspension with specific enforcement type and
 *    severity
 * 4. Validate active status - Confirm response has status='active'
 * 5. Verify response structure - Ensure all required fields are present
 * 6. Validate suspension duration - Confirm expiration timestamp reflects duration
 */
export async function test_api_contributor_suspension_status_active(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass@2024",
        username: RandomGenerator.alphaNumeric(8),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator authenticated successfully",
    moderator.id !== null && moderator.token !== null,
  );

  // Step 2: Generate contributor ID for suspension target
  const contributorId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 3: Create suspension with immediate active status
  const suspension: IDiscussionBoardUserSuspension =
    await api.functional.discussionBoard.moderator.contributors.suspend.create(
      connection,
      {
        contributorId: contributorId,
        body: {
          suspension_type: "posting_restriction",
          reason: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
          severity_level: "moderate",
          duration_days: 7,
        } satisfies IDiscussionBoardUserSuspension.ICreate,
      },
    );
  typia.assert(suspension);

  // Step 4: Validate that suspension status is 'active'
  TestValidator.equals(
    "suspension status is active",
    suspension.status,
    "active",
  );

  // Step 5: Verify all required suspension response fields
  TestValidator.predicate(
    "suspension has valid ID",
    suspension.id !== null && suspension.id !== undefined,
  );
  TestValidator.predicate(
    "suspension has contributor information",
    suspension.contributor !== null && suspension.contributor.id !== null,
  );
  TestValidator.predicate(
    "suspension has moderator information",
    suspension.moderator !== null && suspension.moderator.id !== null,
  );
  TestValidator.equals(
    "suspension type matches request",
    suspension.suspension_type,
    "posting_restriction",
  );
  TestValidator.predicate(
    "suspension has reason text",
    suspension.reason.length > 0,
  );
  TestValidator.equals(
    "severity level matches request",
    suspension.severity_level,
    "moderate",
  );
  TestValidator.predicate(
    "suspension has suspended_at timestamp",
    suspension.suspended_at !== null && suspension.suspended_at !== undefined,
  );

  // Step 6: Validate expiration is calculated based on duration
  TestValidator.predicate(
    "suspension expiration_at exists",
    suspension.expiration_at !== null && suspension.expiration_at !== undefined,
  );
  TestValidator.predicate(
    "expiration_at is after suspended_at",
    new Date(suspension.expiration_at!) > new Date(suspension.suspended_at),
  );
}
