import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaHistory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaHistory";

export async function test_api_karma_history_member_filter_by_change_reason(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account for karma history retrieval
  const memberAuthResponse = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(8),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberAuthResponse);

  // Step 2: Test filtering karma history by different change reasons
  const changeReasons = [
    "vote_created",
    "vote_removed",
    "vote_changed",
    "content_removed",
    "user_suspended",
    "user_banned",
    "correction",
  ] as const;

  for (const reason of changeReasons) {
    // Query karma history with specific change_reason filter
    const filteredHistory =
      await api.functional.communityPlatform.member.karmaHistory.index(
        connection,
        {
          body: {
            change_reason: reason,
            page: 1,
            limit: 10,
          } satisfies ICommunityPlatformKarmaHistory.IRequest,
        },
      );
    typia.assert(filteredHistory);

    // Validate that all returned records match the requested change reason
    if (filteredHistory.data.length > 0) {
      TestValidator.predicate(
        `all karma history records match change_reason filter: ${reason}`,
        () => {
          return filteredHistory.data.every(
            (record) => record.change_reason === reason,
          );
        },
      );
    }

    // Validate pagination metadata
    TestValidator.predicate(
      `pagination metadata is valid for change_reason: ${reason}`,
      () => {
        return (
          filteredHistory.pagination.current > 0 &&
          filteredHistory.pagination.limit > 0 &&
          filteredHistory.pagination.records >= 0 &&
          filteredHistory.pagination.pages >= 0
        );
      },
    );
  }

  // Step 3: Test filtering with no change_reason filter (retrieve all records)
  const allHistory =
    await api.functional.communityPlatform.member.karmaHistory.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(allHistory);

  // Step 4: Verify pagination works correctly with filtered results
  const paginatedTest =
    await api.functional.communityPlatform.member.karmaHistory.index(
      connection,
      {
        body: {
          change_reason: "vote_created",
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(paginatedTest);

  TestValidator.predicate(
    "paginated filtered results respect limit parameter",
    () => {
      return paginatedTest.data.length <= 5;
    },
  );

  // Step 5: Verify that filtering independently returns appropriate subsets
  const voteRemovedHistory =
    await api.functional.communityPlatform.member.karmaHistory.index(
      connection,
      {
        body: {
          change_reason: "vote_removed",
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(voteRemovedHistory);

  if (voteRemovedHistory.data.length > 0) {
    TestValidator.predicate(
      "vote_removed filter returns only matching records",
      () => {
        return voteRemovedHistory.data.every(
          (record) => record.change_reason === "vote_removed",
        );
      },
    );
  }
}
