import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountRestriction";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_contributor_restriction_replace_existing(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for managing restrictions
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        username: RandomGenerator.alphabets(10),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create contributor account to test restriction replacement
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "ContributorPass123!",
        username: RandomGenerator.alphabets(10),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // Step 3: Apply initial posting_restriction to contributor
  const initialRestriction: IDiscussionBoardAccountRestriction =
    await api.functional.discussionBoard.moderator.contributors.restrict(
      connection,
      {
        contributorId: contributor.id,
        body: {
          discussion_board_contributor_id: contributor.id,
          restriction_type: "posting_restriction",
          reason: "Initial posting restriction for policy violation",
          expires_at: new Date(
            Date.now() + 3 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IDiscussionBoardAccountRestriction.ICreate,
      },
    );
  typia.assert(initialRestriction);
  TestValidator.equals(
    "initial restriction is active",
    initialRestriction.status,
    "active",
  );

  // Step 4: Apply new temporary_suspension restriction to replace the initial one
  const replacementRestriction: IDiscussionBoardAccountRestriction =
    await api.functional.discussionBoard.moderator.contributors.restrict(
      connection,
      {
        contributorId: contributor.id,
        body: {
          discussion_board_contributor_id: contributor.id,
          restriction_type: "temporary_suspension",
          reason: "Escalated to temporary suspension for repeated violations",
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IDiscussionBoardAccountRestriction.ICreate,
      },
    );
  typia.assert(replacementRestriction);
  TestValidator.equals(
    "replacement restriction is active",
    replacementRestriction.status,
    "active",
  );

  // Step 5: Verify that replacement restriction has a different ID from initial
  TestValidator.notEquals(
    "replacement restriction ID differs from initial",
    replacementRestriction.id,
    initialRestriction.id,
  );

  // Step 6: Verify that the new restriction has different type
  TestValidator.notEquals(
    "restriction type changed from posting_restriction to temporary_suspension",
    replacementRestriction.restriction_type,
    initialRestriction.restriction_type,
  );

  // Step 7: Validate that the replacement restriction is properly configured
  TestValidator.equals(
    "replacement restriction type is temporary_suspension",
    replacementRestriction.restriction_type,
    "temporary_suspension",
  );

  // Step 8: Verify contributor information is preserved in restriction record
  TestValidator.equals(
    "contributor ID in restriction matches original contributor",
    replacementRestriction.contributor.id,
    contributor.id,
  );

  // Step 9: Verify moderator information is recorded
  TestValidator.equals(
    "moderator ID in restriction matches imposing moderator",
    replacementRestriction.imposed_by_moderator.id,
    moderator.id,
  );

  // Step 10: Verify that restrictions maintain their imposed_at timestamps
  TestValidator.predicate(
    "replacement restriction imposed_at is more recent than initial",
    () => {
      const initialTime = new Date(initialRestriction.imposed_at).getTime();
      const replacementTime = new Date(
        replacementRestriction.imposed_at,
      ).getTime();
      return replacementTime >= initialTime;
    },
  );

  // Step 11: Verify complete restriction history is maintained
  TestValidator.notEquals(
    "replacement restriction expires_at differs from initial",
    replacementRestriction.expires_at,
    initialRestriction.expires_at,
  );
}
