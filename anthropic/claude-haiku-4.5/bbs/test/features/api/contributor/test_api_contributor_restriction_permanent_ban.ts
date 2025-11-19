import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountRestriction";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test permanent ban restriction that permanently disables contributor account.
 *
 * Validates the moderator's ability to impose permanent bans with indefinite
 * enforcement. A permanent ban completely disables a contributor account with
 * no automatic expiration date, ensuring serious violators remain permanently
 * banned from the platform.
 *
 * Process:
 *
 * 1. Create moderator account for enforcement authority
 * 2. Create contributor account as target for permanent ban
 * 3. Impose permanent_ban restriction with null expires_at
 * 4. Verify restriction properties: permanent_ban type, active status, null
 *    expiration, imposed timestamp
 * 5. Confirm contributor is permanently disabled from platform access
 */
export async function test_api_contributor_restriction_permanent_ban(
  connection: api.IConnection,
) {
  // 1. Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecurePassword123!",
        username: RandomGenerator.name(1),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.equals(
    "moderator email matches",
    moderator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "moderator account status is active",
    moderator.account_status,
    "active",
  );

  // 2. Create contributor account to ban
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        password: "SecurePassword123!",
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);
  TestValidator.equals(
    "contributor email matches",
    contributor.email,
    contributorEmail,
  );

  // 3. Impose permanent ban restriction
  const banReason = "Severe platform policy violation with repeated offenses";
  const restriction: IDiscussionBoardAccountRestriction =
    await api.functional.discussionBoard.moderator.contributors.restrict(
      connection,
      {
        contributorId: contributor.id,
        body: {
          discussion_board_contributor_id: contributor.id,
          restriction_type: "permanent_ban",
          reason: banReason,
          expires_at: null,
        } satisfies IDiscussionBoardAccountRestriction.ICreate,
      },
    );
  typia.assert(restriction);

  // 4. Validate permanent ban restriction properties
  TestValidator.equals(
    "restriction type is permanent_ban",
    restriction.restriction_type,
    "permanent_ban",
  );
  TestValidator.equals(
    "restriction status is active",
    restriction.status,
    "active",
  );
  TestValidator.equals(
    "restriction has no expiration date",
    restriction.expires_at,
    null,
  );
  TestValidator.predicate(
    "imposed_at is valid timestamp",
    () => !isNaN(Date.parse(restriction.imposed_at)),
  );
  TestValidator.equals(
    "restriction reason matches provided reason",
    restriction.reason,
    banReason,
  );
  TestValidator.equals(
    "contributor reference matches",
    restriction.contributor.id,
    contributor.id,
  );
  TestValidator.equals(
    "moderator reference matches",
    restriction.imposed_by_moderator.id,
    moderator.id,
  );
  TestValidator.predicate(
    "lifted_by_moderator is null for active permanent ban",
    restriction.lifted_by_moderator === null,
  );
}
