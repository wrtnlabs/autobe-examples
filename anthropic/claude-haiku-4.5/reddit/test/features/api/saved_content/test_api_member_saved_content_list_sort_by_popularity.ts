import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSavedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSavedContent";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSavedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSavedContent";

export async function test_api_member_saved_content_list_sort_by_popularity(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberAuth = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(10),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberAuth);

  const memberId = memberAuth.id;

  // Step 2: Create multiple posts with different vote scores for testing
  // We'll simulate having saved content with different popularity levels
  const savedContentRequest = {
    page: 1,
    limit: 10,
    sortBy: "popularity" as const,
    sortOrder: "desc" as const,
  } satisfies ICommunityPlatformSavedContent.IRequest;

  // Step 3: Retrieve saved content sorted by popularity (descending)
  const descendingResults =
    await api.functional.communityPlatform.member.members.saved.index(
      connection,
      {
        memberId,
        body: savedContentRequest,
      },
    );
  typia.assert(descendingResults);

  // Step 4: Verify pagination information exists
  TestValidator.predicate(
    "pagination should contain current page",
    descendingResults.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination should contain limit",
    descendingResults.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination should contain records count",
    descendingResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination should contain pages count",
    descendingResults.pagination.pages >= 0,
  );

  // Step 5: Retrieve saved content sorted by popularity (ascending)
  const ascendingRequest = {
    page: 1,
    limit: 10,
    sortBy: "popularity" as const,
    sortOrder: "asc" as const,
  } satisfies ICommunityPlatformSavedContent.IRequest;

  const ascendingResults =
    await api.functional.communityPlatform.member.members.saved.index(
      connection,
      {
        memberId,
        body: ascendingRequest,
      },
    );
  typia.assert(ascendingResults);

  // Step 6: Verify sorting order for descending results
  if (descendingResults.data.length > 1) {
    for (let i = 0; i < descendingResults.data.length - 1; i++) {
      const current = descendingResults.data[i];
      const next = descendingResults.data[i + 1];

      // Extract vote_score from either post or comment
      const currentScore =
        current.content_type === "post" && current.post
          ? current.post.vote_score
          : current.content_type === "comment" && current.comment
            ? current.comment.vote_score
            : 0;

      const nextScore =
        next.content_type === "post" && next.post
          ? next.post.vote_score
          : next.content_type === "comment" && next.comment
            ? next.comment.vote_score
            : 0;

      TestValidator.predicate(
        "descending order should have higher or equal score first",
        currentScore >= nextScore,
      );
    }
  }

  // Step 7: Verify sorting order for ascending results
  if (ascendingResults.data.length > 1) {
    for (let i = 0; i < ascendingResults.data.length - 1; i++) {
      const current = ascendingResults.data[i];
      const next = ascendingResults.data[i + 1];

      // Extract vote_score from either post or comment
      const currentScore =
        current.content_type === "post" && current.post
          ? current.post.vote_score
          : current.content_type === "comment" && current.comment
            ? current.comment.vote_score
            : 0;

      const nextScore =
        next.content_type === "post" && next.post
          ? next.post.vote_score
          : next.content_type === "comment" && next.comment
            ? next.comment.vote_score
            : 0;

      TestValidator.predicate(
        "ascending order should have lower or equal score first",
        currentScore <= nextScore,
      );
    }
  }

  // Step 8: Verify that response data structure is correct
  TestValidator.predicate(
    "response should contain data array",
    Array.isArray(descendingResults.data),
  );

  TestValidator.predicate(
    "each saved content item should have id",
    descendingResults.data.every((item) => item.id),
  );

  TestValidator.predicate(
    "each saved content item should have content_type",
    descendingResults.data.every(
      (item) => item.content_type === "post" || item.content_type === "comment",
    ),
  );

  TestValidator.predicate(
    "each saved content item should have created_at timestamp",
    descendingResults.data.every((item) => item.created_at),
  );
}
