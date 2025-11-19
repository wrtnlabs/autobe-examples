import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountRestriction";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test successful posting restriction enforcement on a contributor account.
 *
 * Validates that a moderator can impose a temporary posting restriction on a
 * contributor with a specified expiration date and clear violation reason. The
 * restriction prevents article and comment creation and records complete
 * metadata with contributor and moderator details. Status must be 'active' for
 * the newly imposed restriction.
 *
 * Test workflow:
 *
 * 1. Create moderator account for enforcement authorization
 * 2. Create contributor account to apply restriction against
 * 3. Apply posting restriction with violation reason and future expiration
 * 4. Validate restriction metadata and active status
 */
export async function test_api_contributor_restriction_posting_prevention(
  connection: api.IConnection,
) {
  // 1. Create moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    username: RandomGenerator.alphabets(8),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // 2. Create contributor account
  const contributorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    username: RandomGenerator.alphabets(8),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IDiscussionBoardContributor.ICreate;

  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: contributorData,
    });
  typia.assert(contributor);

  // 3. Apply posting restriction to contributor
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7); // 7 days from now

  const restrictionData = {
    discussion_board_contributor_id: contributor.id,
    restriction_type: "posting_restriction" as const,
    reason:
      "Violation of community guidelines regarding spam and abusive content",
    expires_at: futureDate.toISOString(),
  } satisfies IDiscussionBoardAccountRestriction.ICreate;

  const restriction: IDiscussionBoardAccountRestriction =
    await api.functional.discussionBoard.moderator.contributors.restrict(
      connection,
      {
        contributorId: contributor.id,
        body: restrictionData,
      },
    );
  typia.assert(restriction);

  // 4. Validate restriction metadata
  TestValidator.equals(
    "restriction type should be posting_restriction",
    restriction.restriction_type,
    "posting_restriction",
  );

  TestValidator.equals(
    "restriction reason matches input",
    restriction.reason,
    restrictionData.reason,
  );

  TestValidator.equals(
    "restriction status should be active",
    restriction.status,
    "active",
  );

  TestValidator.equals(
    "contributor id matches",
    restriction.contributor.id,
    contributor.id,
  );

  TestValidator.equals(
    "contributor username matches",
    restriction.contributor.username,
    contributor.username,
  );

  TestValidator.equals(
    "moderator id matches",
    restriction.imposed_by_moderator.id,
    moderator.id,
  );

  TestValidator.equals(
    "moderator username matches",
    restriction.imposed_by_moderator.username,
    moderator.username,
  );

  TestValidator.predicate("imposed_at should be set to current time", () => {
    const imposedTime = new Date(restriction.imposed_at);
    const now = new Date();
    const timeDiff = now.getTime() - imposedTime.getTime();
    return timeDiff >= 0 && timeDiff < 60000; // Within 60 seconds
  });

  TestValidator.predicate("expires_at should be in the future", () => {
    const expiresTime = new Date(restriction.expires_at!);
    return expiresTime > new Date();
  });

  TestValidator.predicate(
    "lifted_at should be null for newly imposed restriction",
    restriction.lifted_at === null,
  );

  TestValidator.predicate(
    "lifted_by_moderator should be null for newly imposed restriction",
    restriction.lifted_by_moderator === null,
  );
}
