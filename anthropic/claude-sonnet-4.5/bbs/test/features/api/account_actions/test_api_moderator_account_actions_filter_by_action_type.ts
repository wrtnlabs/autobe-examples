import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAccountAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountAction";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAccountAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAccountAction";

/**
 * Test filtering moderator account action history by action type.
 *
 * This test validates that the action_type filter parameter correctly filters
 * moderator enforcement actions to retrieve only suspensions or only bans. It
 * verifies that moderators and administrators can analyze specific enforcement
 * patterns by filtering the action history.
 *
 * Test workflow:
 *
 * 1. Authenticate as a moderator who will apply enforcement actions
 * 2. Create multiple member accounts as targets for different action types
 * 3. Apply a mix of temporary suspensions and permanent bans to members
 * 4. Query action history with action_type filter set to 'suspension' and verify
 *    only suspension records are returned
 * 5. Query action history with action_type filter set to 'ban' and verify only ban
 *    records are returned
 * 6. Query action history without filter and verify all actions are returned
 *
 * This ensures the filtering capability enables moderators and administrators
 * to analyze specific enforcement patterns such as reviewing a moderator's use
 * of permanent bans versus temporary suspensions.
 */
export async function test_api_moderator_account_actions_filter_by_action_type(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator who will apply enforcement actions
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string>(),
        username: typia.random<string>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create multiple member accounts as targets (4 members for 2 suspensions + 2 bans)
  const members: IDiscussionBoardMember.IAuthorized[] =
    await ArrayUtil.asyncRepeat(4, async () => {
      const member = await api.functional.auth.member.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: typia.random<string & tags.Format<"password">>(),
          username: typia.random<
            string & tags.MinLength<3> & tags.MaxLength<30>
          >(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardMember.ICreate,
      });
      typia.assert(member);
      return member;
    });

  // Step 3: Apply temporary suspensions to first 2 members
  const suspensionDurations = [1, 7] as const;
  const suspensions: IDiscussionBoardAccountAction[] = await ArrayUtil.asyncMap(
    members.slice(0, 2),
    async (member, index) => {
      const suspension =
        await api.functional.discussionBoard.moderator.accountActions.create(
          connection,
          {
            body: {
              discussion_board_member_id: member.id,
              action_type: "suspension",
              reason: RandomGenerator.paragraph({
                sentences: 5,
                wordMin: 5,
                wordMax: 10,
              }),
              duration_days: suspensionDurations[index],
            } satisfies IDiscussionBoardAccountAction.ICreate,
          },
        );
      typia.assert(suspension);
      return suspension;
    },
  );

  // Step 4: Apply permanent bans to last 2 members
  const bans: IDiscussionBoardAccountAction[] = await ArrayUtil.asyncMap(
    members.slice(2, 4),
    async (member) => {
      const ban =
        await api.functional.discussionBoard.moderator.accountActions.create(
          connection,
          {
            body: {
              discussion_board_member_id: member.id,
              action_type: "ban",
              reason: RandomGenerator.paragraph({
                sentences: 5,
                wordMin: 5,
                wordMax: 10,
              }),
              duration_days: null,
            } satisfies IDiscussionBoardAccountAction.ICreate,
          },
        );
      typia.assert(ban);
      return ban;
    },
  );

  // Step 5: Query with action_type filter set to 'suspension'
  const suspensionResults: IPageIDiscussionBoardAccountAction.ISummary =
    await api.functional.discussionBoard.moderator.moderators.accountActions.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          action_type: "suspension",
        } satisfies IDiscussionBoardAccountAction.IRequest,
      },
    );
  typia.assert(suspensionResults);

  // Verify only suspension records are returned
  TestValidator.predicate(
    "suspension filter should return at least 2 suspension records",
    suspensionResults.data.length >= 2,
  );

  for (const action of suspensionResults.data) {
    TestValidator.equals(
      "all returned actions should be suspensions",
      action.action_type,
      "suspension",
    );
  }

  // Step 6: Query with action_type filter set to 'ban'
  const banResults: IPageIDiscussionBoardAccountAction.ISummary =
    await api.functional.discussionBoard.moderator.moderators.accountActions.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          action_type: "ban",
        } satisfies IDiscussionBoardAccountAction.IRequest,
      },
    );
  typia.assert(banResults);

  // Verify only ban records are returned
  TestValidator.predicate(
    "ban filter should return at least 2 ban records",
    banResults.data.length >= 2,
  );

  for (const action of banResults.data) {
    TestValidator.equals(
      "all returned actions should be bans",
      action.action_type,
      "ban",
    );
  }

  // Step 7: Query without filter to verify all actions are returned
  const allResults: IPageIDiscussionBoardAccountAction.ISummary =
    await api.functional.discussionBoard.moderator.moderators.accountActions.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {} satisfies IDiscussionBoardAccountAction.IRequest,
      },
    );
  typia.assert(allResults);

  // Verify total count includes all created actions (2 suspensions + 2 bans = 4)
  TestValidator.predicate(
    "unfiltered query should return all actions",
    allResults.data.length >= 4,
  );

  // Verify we have both action types in unfiltered results
  const hasSuspensions = allResults.data.some(
    (action) => action.action_type === "suspension",
  );
  const hasBans = allResults.data.some(
    (action) => action.action_type === "ban",
  );

  TestValidator.predicate(
    "unfiltered results should contain suspension actions",
    hasSuspensions,
  );

  TestValidator.predicate(
    "unfiltered results should contain ban actions",
    hasBans,
  );
}
