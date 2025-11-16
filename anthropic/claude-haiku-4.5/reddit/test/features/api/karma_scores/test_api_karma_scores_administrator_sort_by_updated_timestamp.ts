import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaScore";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaScore";

/**
 * Test sorting karma scores by updated_at timestamp in both ascending and
 * descending order.
 *
 * This test validates that administrators can properly retrieve and sort karma
 * scores by the updated_at timestamp field. The test covers both descending
 * order (most recent changes first) and ascending order (oldest changes first)
 * to ensure proper timestamp ordering for tracking recently active contributors
 * versus stale records.
 *
 * Test flow:
 *
 * 1. Authenticate as administrator
 * 2. Query karma scores sorted by updated_at in descending order (most recent
 *    first)
 * 3. Verify descending order is chronologically correct (each timestamp >= next)
 * 4. Query karma scores sorted by updated_at in ascending order (oldest first)
 * 5. Verify ascending order is chronologically correct (each timestamp <= next)
 * 6. Validate paginated results contain valid karma score data
 */
export async function test_api_karma_scores_administrator_sort_by_updated_timestamp(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminCreateData = {
    email: adminEmail,
    password: RandomGenerator.alphabets(10) + "Ab123!",
    username: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCreateData,
    });
  typia.assert(admin);

  // Step 2: Query karma scores sorted by updated_at in descending order
  const descendingRequest = {
    page: 1,
    limit: 20,
    orderBy: "updated_at",
    order: "desc",
  } satisfies ICommunityPlatformKarmaScore.IRequest;

  const descendingResult: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.administrator.karmaScores.index(
      connection,
      {
        body: descendingRequest,
      },
    );
  typia.assert(descendingResult);

  // Step 3: Verify descending order is chronologically correct
  if (descendingResult.data.length > 1) {
    for (let i = 0; i < descendingResult.data.length - 1; i++) {
      const current = new Date(descendingResult.data[i].updated_at).getTime();
      const next = new Date(descendingResult.data[i + 1].updated_at).getTime();
      TestValidator.predicate(
        "descending order: current timestamp >= next timestamp",
        current >= next,
      );
    }
  }

  // Step 4: Query karma scores sorted by updated_at in ascending order
  const ascendingRequest = {
    page: 1,
    limit: 20,
    orderBy: "updated_at",
    order: "asc",
  } satisfies ICommunityPlatformKarmaScore.IRequest;

  const ascendingResult: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.administrator.karmaScores.index(
      connection,
      {
        body: ascendingRequest,
      },
    );
  typia.assert(ascendingResult);

  // Step 5: Verify ascending order is chronologically correct
  if (ascendingResult.data.length > 1) {
    for (let i = 0; i < ascendingResult.data.length - 1; i++) {
      const current = new Date(ascendingResult.data[i].updated_at).getTime();
      const next = new Date(ascendingResult.data[i + 1].updated_at).getTime();
      TestValidator.predicate(
        "ascending order: current timestamp <= next timestamp",
        current <= next,
      );
    }
  }

  // Step 6: Validate paginated results contain valid karma score data
  TestValidator.predicate(
    "pagination current page is valid",
    descendingResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    descendingResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    descendingResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    descendingResult.pagination.pages >= 0,
  );

  // Validate karma score data structure
  for (const karma of descendingResult.data) {
    TestValidator.predicate(
      "karma score has valid id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        karma.id,
      ),
    );
    TestValidator.predicate(
      "post_karma is non-negative",
      karma.post_karma >= 0,
    );
    TestValidator.predicate(
      "comment_karma is non-negative",
      karma.comment_karma >= 0,
    );
    TestValidator.predicate(
      "total_karma equals post_karma + comment_karma",
      karma.total_karma === karma.post_karma + karma.comment_karma,
    );
    TestValidator.predicate(
      "updated_at is valid ISO date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(karma.updated_at),
    );
  }
}
