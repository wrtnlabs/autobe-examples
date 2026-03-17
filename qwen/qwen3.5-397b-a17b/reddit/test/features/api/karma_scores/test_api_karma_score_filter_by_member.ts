import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneKarmaScore";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_karma_score_filter_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections for different members
  const member1Connection: api.IConnection = { host: connection.host };
  const member2Connection: api.IConnection = { host: connection.host };
  // Query all karma scores without filter to get available records
  const allKarmaScores = await api.functional.redditClone.karma_scores.index(
    member1Connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IRedditCloneKarmaScore.IRequest,
    },
  );
  typia.assert(allKarmaScores);
  // Verify we have at least one karma score record
  TestValidator.predicate(
    "should have at least one karma score",
    allKarmaScores.data.length >= 1,
  );
  // Get unique member IDs from the results
  const memberIds = Array.from(
    new Set(allKarmaScores.data.map((score) => score.member.id)),
  );
  // Initialize variables for cross-block comparisons
  let firstFilteredKarmaScores: IPageIRedditCloneKarmaScore.ISummary | null =
    null;
  let firstMemberId: string | null = null;
  // Test filtering with first member ID if available
  if (memberIds.length >= 1) {
    firstMemberId = memberIds[0];
    // Query karma scores filtered by specific member_id
    firstFilteredKarmaScores =
      await api.functional.redditClone.karma_scores.index(member2Connection, {
        body: {
          member_id: firstMemberId,
          page: 1,
          limit: 20,
        } satisfies IRedditCloneKarmaScore.IRequest,
      });
    typia.assert(firstFilteredKarmaScores);
    // Verify only one karma score is returned (each member has exactly one)
    TestValidator.equals(
      "filtered results count",
      firstFilteredKarmaScores.data.length,
      1,
    );
    // Verify the returned karma score belongs to the filtered member
    const filteredScore = firstFilteredKarmaScores.data[0];
    TestValidator.equals(
      "member_id matches filter",
      filteredScore.member.id,
      firstMemberId,
    );
    // Verify pagination metadata for single result
    TestValidator.equals(
      "current page",
      firstFilteredKarmaScores.pagination.current,
      1,
    );
    TestValidator.equals(
      "total records",
      firstFilteredKarmaScores.pagination.records,
      1,
    );
    TestValidator.equals(
      "total pages",
      firstFilteredKarmaScores.pagination.pages,
      1,
    );
  }
  // Test with second member ID if available
  if (memberIds.length >= 2 && firstFilteredKarmaScores !== null) {
    const secondMemberId = memberIds[1];
    const secondFilteredScores =
      await api.functional.redditClone.karma_scores.index(member1Connection, {
        body: {
          member_id: secondMemberId,
          page: 1,
          limit: 20,
        } satisfies IRedditCloneKarmaScore.IRequest,
      });
    typia.assert(secondFilteredScores);
    // Verify only one karma score is returned
    TestValidator.equals(
      "second filter results count",
      secondFilteredScores.data.length,
      1,
    );
    // Verify the member reference matches the filter
    TestValidator.equals(
      "second member_id matches filter",
      secondFilteredScores.data[0].member.id,
      secondMemberId,
    );
    // Verify different members return different karma scores
    TestValidator.notEquals(
      "different members have different karma scores",
      firstFilteredKarmaScores.data[0].member.id,
      secondFilteredScores.data[0].member.id,
    );
  }
  // Test with a non-existent member ID (should return empty results)
  const nonExistentMemberId = typia.random<string & tags.Format<"uuid">>();
  const emptyResults = await api.functional.redditClone.karma_scores.index(
    member2Connection,
    {
      body: {
        member_id: nonExistentMemberId,
        page: 1,
        limit: 20,
      } satisfies IRedditCloneKarmaScore.IRequest,
    },
  );
  typia.assert(emptyResults);
  // Verify empty results for non-existent member
  TestValidator.equals(
    "non-existent member returns empty",
    emptyResults.data.length,
    0,
  );
  TestValidator.equals(
    "empty records count",
    emptyResults.pagination.records,
    0,
  );
  TestValidator.equals("empty pages count", emptyResults.pagination.pages, 0);
}
