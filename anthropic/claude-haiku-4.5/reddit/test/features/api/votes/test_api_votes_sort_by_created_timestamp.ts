import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVote";

/**
 * Test sorting votes by creation timestamp in ascending and descending order.
 *
 * This test validates that the votes API properly sorts votes by their creation
 * timestamp in both ascending (oldest first) and descending (most recent first)
 * order.
 *
 * The test authenticates as a member and queries the votes API with the
 * sort_by='created_at' parameter in both 'asc' and 'desc' orders, verifying
 * that:
 *
 * - Descending sort returns votes in reverse chronological order (most recent
 *   first)
 * - Ascending sort returns votes in chronological order (oldest first)
 * - Vote timestamps are in correct order for both directions
 * - Pagination works correctly with sorted results
 */
export async function test_api_votes_sort_by_created_timestamp(
  connection: api.IConnection,
) {
  // 1. Authenticate as member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(10),
        password: RandomGenerator.alphabets(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 2. Query votes with descending sort by created_at (most recent first)
  const descResults: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.index(connection, {
      body: {
        page: 1,
        limit: 100,
        sort_by: "created_at",
        order: "desc",
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(descResults);

  // Verify descending order - each vote should have created_at >= next vote's created_at
  for (let i = 0; i < descResults.data.length - 1; i++) {
    const currentVote = descResults.data[i];
    const nextVote = descResults.data[i + 1];
    TestValidator.predicate(
      `vote at index ${i} should have later or equal timestamp than vote at index ${i + 1} in desc order`,
      new Date(currentVote.created_at) >= new Date(nextVote.created_at),
    );
  }

  // 3. Query votes with ascending sort by created_at (oldest first)
  const ascResults: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.index(connection, {
      body: {
        page: 1,
        limit: 100,
        sort_by: "created_at",
        order: "asc",
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(ascResults);

  // Verify ascending order - each vote should have created_at <= next vote's created_at
  for (let i = 0; i < ascResults.data.length - 1; i++) {
    const currentVote = ascResults.data[i];
    const nextVote = ascResults.data[i + 1];
    TestValidator.predicate(
      `vote at index ${i} should have earlier or equal timestamp than vote at index ${i + 1} in asc order`,
      new Date(currentVote.created_at) <= new Date(nextVote.created_at),
    );
  }

  // 4. Verify both orders return the same total votes
  TestValidator.equals(
    "total votes should be consistent across sort orders",
    descResults.data.length,
    ascResults.data.length,
  );

  // 5. Verify ascending and descending are inverse of each other
  if (descResults.data.length > 0) {
    TestValidator.equals(
      "first vote in desc order should match last vote in asc order",
      descResults.data[0].id,
      ascResults.data[ascResults.data.length - 1].id,
    );
    TestValidator.equals(
      "last vote in desc order should match first vote in asc order",
      descResults.data[descResults.data.length - 1].id,
      ascResults.data[0].id,
    );
  }

  // 6. Test pagination with descending sort
  const paginatedDesc: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.index(connection, {
      body: {
        page: 1,
        limit: 10,
        sort_by: "created_at",
        order: "desc",
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(paginatedDesc);

  // Verify paginated results maintain sort order
  for (let i = 0; i < paginatedDesc.data.length - 1; i++) {
    const currentVote = paginatedDesc.data[i];
    const nextVote = paginatedDesc.data[i + 1];
    TestValidator.predicate(
      `paginated vote at index ${i} should be sorted correctly in desc order`,
      new Date(currentVote.created_at) >= new Date(nextVote.created_at),
    );
  }

  // 7. Test pagination with ascending sort
  const paginatedAsc: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.index(connection, {
      body: {
        page: 1,
        limit: 10,
        sort_by: "created_at",
        order: "asc",
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(paginatedAsc);

  // Verify paginated results maintain sort order in ascending
  for (let i = 0; i < paginatedAsc.data.length - 1; i++) {
    const currentVote = paginatedAsc.data[i];
    const nextVote = paginatedAsc.data[i + 1];
    TestValidator.predicate(
      `paginated vote at index ${i} should be sorted correctly in asc order`,
      new Date(currentVote.created_at) <= new Date(nextVote.created_at),
    );
  }
}
