import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSuspension";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserSuspension";

/**
 * Test searching suspensions filtered by suspension status (active, expired).
 *
 * This test validates that the suspension search API correctly filters
 * suspensions based on their current status. It creates suspensions with
 * different statuses and verifies that the search functionality returns the
 * correct subset of suspensions for each status filter.
 *
 * Note: This test focuses on active and expired statuses only, as there is no
 * API endpoint available to lift suspensions early (which would create lifted
 * status).
 *
 * Workflow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Create multiple member accounts for suspension testing
 * 3. Create suspensions with active and expired statuses
 * 4. Search by "active" status and verify only active suspensions are returned
 * 5. Search by "expired" status and verify only expired suspensions are returned
 */
export async function test_api_suspension_search_by_status(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<30> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: moderatorEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create member accounts to be suspended
  const member1: IDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.members.create(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<30> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member1);

  const member2: IDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.members.create(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<30> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member2);

  // Step 3: Create suspensions with different statuses

  // Active suspension: expires in the future
  const now = new Date();
  const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const activeSuspension: IDiscussionBoardUserSuspension =
    await api.functional.discussionBoard.moderator.moderation.suspensions.create(
      connection,
      {
        body: {
          discussion_board_member_id: member1.id,
          suspension_reason: "Repeated harassment",
          suspension_details:
            "User has been warned multiple times for harassing other members",
          expires_at: futureDate.toISOString(),
        } satisfies IDiscussionBoardUserSuspension.ICreate,
      },
    );
  typia.assert(activeSuspension);

  // Expired suspension: expires in the past
  const pastDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const expiredSuspension: IDiscussionBoardUserSuspension =
    await api.functional.discussionBoard.moderator.moderation.suspensions.create(
      connection,
      {
        body: {
          discussion_board_member_id: member2.id,
          suspension_reason: "Spam activity",
          suspension_details: "User posted spam content multiple times",
          suspended_at: new Date(
            now.getTime() - 60 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          expires_at: pastDate.toISOString(),
        } satisfies IDiscussionBoardUserSuspension.ICreate,
      },
    );
  typia.assert(expiredSuspension);

  // Step 4: Search for active suspensions
  const activeResults: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          status: "active",
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(activeResults);

  TestValidator.predicate(
    "active suspensions search should return results",
    activeResults.data.length > 0,
  );

  const activeIds = activeResults.data.map((s) => s.id);
  TestValidator.predicate(
    "active suspension should be in active results",
    activeIds.includes(activeSuspension.id),
  );

  TestValidator.predicate(
    "expired suspension should NOT be in active results",
    !activeIds.includes(expiredSuspension.id),
  );

  // Step 5: Search for expired suspensions
  const expiredResults: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          status: "expired",
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(expiredResults);

  TestValidator.predicate(
    "expired suspensions search should return results",
    expiredResults.data.length > 0,
  );

  const expiredIds = expiredResults.data.map((s) => s.id);
  TestValidator.predicate(
    "expired suspension should be in expired results",
    expiredIds.includes(expiredSuspension.id),
  );

  TestValidator.predicate(
    "active suspension should NOT be in expired results",
    !expiredIds.includes(activeSuspension.id),
  );
}
