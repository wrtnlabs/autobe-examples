import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSuspension";

/**
 * Test contributor suspension with embedded contributor context validation.
 *
 * Validates that when a moderator suspends a contributor, the suspension record
 * properly embeds the contributor's identification information (id and
 * username). This ensures that suspension records maintain complete contributor
 * context for audit trails, enforcement tracking, and compliance purposes.
 *
 * Process:
 *
 * 1. Create moderator account via authentication
 * 2. Generate random contributor ID to be suspended
 * 3. Create suspension record with violation details
 * 4. Validate response contains embedded contributor information
 * 5. Verify contributor id matches the suspended user's identifier
 * 6. Verify contributor username is present in the suspension record
 */
export async function test_api_contributor_suspension_contributor_context(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator to enable suspension operations
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(8) + "Aa1!",
        username: RandomGenerator.alphabets(8),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Generate a random contributor ID to be suspended
  const contributorId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 3: Create suspension record for the contributor
  const suspension: IDiscussionBoardUserSuspension =
    await api.functional.discussionBoard.moderator.contributors.suspend.create(
      connection,
      {
        contributorId: contributorId,
        body: {
          suspension_type: RandomGenerator.pick([
            "posting_restriction",
            "account_suspension",
            "permanent_ban",
          ] as const),
          reason: RandomGenerator.paragraph({ sentences: 5 }),
          severity_level: RandomGenerator.pick([
            "minor",
            "moderate",
            "severe",
            "permanent",
          ] as const),
          duration_days: RandomGenerator.pick([3, 7, 30, 60]),
        } satisfies IDiscussionBoardUserSuspension.ICreate,
      },
    );
  typia.assert(suspension);

  // Step 4: Validate that suspension record contains embedded contributor information
  TestValidator.predicate(
    "suspension has contributor information embedded",
    suspension.contributor !== null && suspension.contributor !== undefined,
  );

  // Step 5: Verify contributor id in suspension matches the suspended user's identifier
  TestValidator.equals(
    "contributor id in suspension matches suspended user",
    suspension.contributor.id,
    contributorId,
  );

  // Step 6: Verify contributor username is present and is a string
  TestValidator.predicate(
    "contributor username is present in suspension record",
    typeof suspension.contributor.username === "string" &&
      suspension.contributor.username.length > 0,
  );
}
