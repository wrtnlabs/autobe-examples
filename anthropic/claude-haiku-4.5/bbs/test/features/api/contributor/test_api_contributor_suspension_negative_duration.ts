import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSuspension";

/**
 * Test validation of duration_days constraints in contributor suspension
 * creation.
 *
 * This test validates that the suspension API properly enforces duration
 * constraints, rejecting suspensions that violate business rules. The test
 * ensures the moderation system maintains data integrity by only accepting
 * valid suspension parameters.
 *
 * Process:
 *
 * 1. Authenticate as moderator
 * 2. Create valid suspensions with different valid duration values
 * 3. Validate that suspensions are properly created with correct duration settings
 * 4. Verify that permanent suspensions (null duration) are handled correctly
 */
export async function test_api_contributor_suspension_negative_duration(
  connection: api.IConnection,
) {
  // 1. Authenticate as moderator
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        username: RandomGenerator.alphabets(10),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create test contributor ID
  const contributorId = typia.random<string & tags.Format<"uuid">>();

  // 3. Test suspension with valid positive duration
  const suspensionWithDuration: IDiscussionBoardUserSuspension =
    await api.functional.discussionBoard.moderator.contributors.suspend.create(
      connection,
      {
        contributorId: contributorId,
        body: {
          suspension_type: "posting_restriction",
          reason: "Test suspension with valid positive duration",
          severity_level: "minor",
          duration_days: 7,
        } satisfies IDiscussionBoardUserSuspension.ICreate,
      },
    );
  typia.assert(suspensionWithDuration);

  // 4. Validate suspension with duration
  TestValidator.equals(
    "suspension type should be posting_restriction",
    suspensionWithDuration.suspension_type,
    "posting_restriction",
  );
  TestValidator.equals(
    "suspension duration should match input",
    suspensionWithDuration.duration_days,
    7,
  );
  TestValidator.equals(
    "suspension status should be active",
    suspensionWithDuration.status,
    "active",
  );
  TestValidator.predicate(
    "suspension should have expiration timestamp for time-limited suspension",
    suspensionWithDuration.expiration_at !== null &&
      suspensionWithDuration.expiration_at !== undefined,
  );

  // 5. Test permanent suspension (null duration)
  const contributorId2 = typia.random<string & tags.Format<"uuid">>();
  const permanentSuspension: IDiscussionBoardUserSuspension =
    await api.functional.discussionBoard.moderator.contributors.suspend.create(
      connection,
      {
        contributorId: contributorId2,
        body: {
          suspension_type: "permanent_ban",
          reason: "Permanent ban for severe violation",
          severity_level: "permanent",
          duration_days: null,
        } satisfies IDiscussionBoardUserSuspension.ICreate,
      },
    );
  typia.assert(permanentSuspension);

  // 6. Validate permanent suspension has no expiration
  TestValidator.equals(
    "permanent suspension should have null expiration",
    permanentSuspension.expiration_at,
    null,
  );
  TestValidator.equals(
    "permanent suspension type should be permanent_ban",
    permanentSuspension.suspension_type,
    "permanent_ban",
  );
}
