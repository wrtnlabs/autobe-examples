import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaHistory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaHistory";

export async function test_api_karma_history_moderator_filter_by_change_reason(
  connection: api.IConnection,
) {
  /**
   * Create a moderator account for testing karma history filtering by change
   * reason
   */
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(10),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  /** Test 1: Filter by vote_created change reason */
  const voteCreatedResult: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.moderator.karmaHistory.index(
      connection,
      {
        body: {
          change_reason: "vote_created",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(voteCreatedResult);
  TestValidator.predicate(
    "vote_created results should only contain vote_created change reason",
    voteCreatedResult.data.every(
      (record) => record.change_reason === "vote_created",
    ),
  );

  /** Test 2: Filter by vote_removed change reason */
  const voteRemovedResult: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.moderator.karmaHistory.index(
      connection,
      {
        body: {
          change_reason: "vote_removed",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(voteRemovedResult);
  TestValidator.predicate(
    "vote_removed results should only contain vote_removed change reason",
    voteRemovedResult.data.every(
      (record) => record.change_reason === "vote_removed",
    ),
  );

  /** Test 3: Filter by vote_changed change reason */
  const voteChangedResult: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.moderator.karmaHistory.index(
      connection,
      {
        body: {
          change_reason: "vote_changed",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(voteChangedResult);
  TestValidator.predicate(
    "vote_changed results should only contain vote_changed change reason",
    voteChangedResult.data.every(
      (record) => record.change_reason === "vote_changed",
    ),
  );

  /** Test 4: Filter by vote_reversed change reason */
  const voteReversedResult: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.moderator.karmaHistory.index(
      connection,
      {
        body: {
          change_reason: "vote_reversed",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(voteReversedResult);
  TestValidator.predicate(
    "vote_reversed results should only contain vote_reversed change reason",
    voteReversedResult.data.every(
      (record) => record.change_reason === "vote_reversed",
    ),
  );

  /** Test 5: Filter by content_removed change reason */
  const contentRemovedResult: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.moderator.karmaHistory.index(
      connection,
      {
        body: {
          change_reason: "content_removed",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(contentRemovedResult);
  TestValidator.predicate(
    "content_removed results should only contain content_removed change reason",
    contentRemovedResult.data.every(
      (record) => record.change_reason === "content_removed",
    ),
  );

  /** Test 6: Filter by user_suspended change reason */
  const userSuspendedResult: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.moderator.karmaHistory.index(
      connection,
      {
        body: {
          change_reason: "user_suspended",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(userSuspendedResult);
  TestValidator.predicate(
    "user_suspended results should only contain user_suspended change reason",
    userSuspendedResult.data.every(
      (record) => record.change_reason === "user_suspended",
    ),
  );

  /** Test 7: Filter by user_banned change reason */
  const userBannedResult: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.moderator.karmaHistory.index(
      connection,
      {
        body: {
          change_reason: "user_banned",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(userBannedResult);
  TestValidator.predicate(
    "user_banned results should only contain user_banned change reason",
    userBannedResult.data.every(
      (record) => record.change_reason === "user_banned",
    ),
  );

  /** Test 8: Filter by correction change reason */
  const correctionResult: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.moderator.karmaHistory.index(
      connection,
      {
        body: {
          change_reason: "correction",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(correctionResult);
  TestValidator.predicate(
    "correction results should only contain correction change reason",
    correctionResult.data.every(
      (record) => record.change_reason === "correction",
    ),
  );

  /**
   * Test 9: Retrieve karma history without change_reason filter to verify data
   * exists
   */
  const allHistoryResult: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.moderator.karmaHistory.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(allHistoryResult);
  TestValidator.predicate(
    "pagination metadata should be present",
    allHistoryResult.pagination !== null &&
      allHistoryResult.pagination !== undefined,
  );

  /** Test 10: Verify that pagination works correctly */
  TestValidator.predicate(
    "current page should be 1",
    allHistoryResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit should be 20",
    allHistoryResult.pagination.limit === 20,
  );

  /** Test 11: Combine change_reason filter with member_id for targeted analysis */
  if (allHistoryResult.data.length > 0) {
    const firstMember = allHistoryResult.data[0];
    const memberId: string & tags.Format<"uuid"> = firstMember.member.id;

    const memberSpecificResult: IPageICommunityPlatformKarmaHistory =
      await api.functional.communityPlatform.moderator.karmaHistory.index(
        connection,
        {
          body: {
            member_id: memberId,
            change_reason: "vote_created",
            page: 1,
            limit: 10,
          } satisfies ICommunityPlatformKarmaHistory.IRequest,
        },
      );
    typia.assert(memberSpecificResult);
    TestValidator.predicate(
      "combined filter results should only contain specified member_id",
      memberSpecificResult.data.every(
        (record) => record.member.id === memberId,
      ),
    );
    TestValidator.predicate(
      "combined filter results should only contain vote_created change reason",
      memberSpecificResult.data.every(
        (record) => record.change_reason === "vote_created",
      ),
    );
  }
}
