import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityCommunitySnapshot";
import type { IRedditLikeCommunityCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving all community configuration snapshots without filters.
 *
 * Verifies that the community snapshots endpoint returns paginated results with accurate metadata when no filters are applied. The endpoint retrieves immutable point-in-time records capturing community identity from the audit trail, ordered by creation date descending (newest first).
 *
 * Validates that pagination information correctly reflects the total records available and that each snapshot record contains valid community identity data including community reference, owner reference, and configuration details.
 *
 * 1. Request all community snapshots with no filters applied.
 * 2. Validate response structure with typia.assert().
 * 3. Verify pagination metadata contains valid page information.
 * 4. Confirm results are returned (data array present) with snapshot summaries.
 */
export async function test_api_community_snapshots_list_all(
  connection: api.IConnection,
): Promise<void> {
  const requestConnection: api.IConnection = { host: connection.host };
  const body = {} satisfies IRedditLikeCommunityCommunitySnapshot.IRequest;
  const response =
    await api.functional.redditLikeCommunity.community_snapshots.index(
      requestConnection,
      { body },
    );
  typia.assert(response);
  typia.assert(response.pagination);
  TestValidator.predicate(
    "pagination current page is positive",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.equals(
    "pagination current is 1 for default page",
    response.pagination.current,
    1,
  );
  TestValidator.predicate("data array is non-null", response.data !== null);
  TestValidator.predicate(
    "data length matches on page when no filters",
    response.data.length <= response.pagination.limit,
  );
  if (response.data.length > 1) {
    TestValidator.predicate(
      "results contain snapshot summaries with properties",
      response.data.every(
        (snapshot) =>
          snapshot.community_id !== undefined ||
          snapshot.owner_id !== undefined ||
          snapshot.name !== undefined,
      ),
    );
  }
}
