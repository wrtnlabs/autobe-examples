import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostVote";

/**
 * Validate moderator audit search for post votes by exercising the audit
 * endpoint as an authenticated moderator.
 *
 * - Register a new moderator account and validate token-based authentication.
 * - Attempt to query /communityPlatform/moderator/postVotes without
 *   authentication and assert access denial.
 * - With moderator role, perform audit searches with various filters: user_id,
 *   post_id, vote_type, date range, deleted inclusion, sorted by multiple
 *   fields, and always verify paginated structure.
 * - Validate boundary cases including empty result set, first/last page, and
 *   filter permutations.
 * - Confirm returned vote summaries match filter criteria.
 * - Test security that only moderator can use this endpoint.
 */
export async function test_api_post_vote_audit_as_moderator(
  connection: api.IConnection,
) {
  // 1. Register new moderator and get JWT
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorJoin = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "StrongPass123!",
      status: "active",
      business_status: null,
      href: "https://platform.example.com/register",
      referrer: "https://platform.example.com/landing",
      ip: "127.0.0.1",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderatorJoin);
  TestValidator.predicate(
    "moderator session token issued",
    typeof moderatorJoin.token.access === "string" &&
      moderatorJoin.token.access.length > 0,
  );

  // 2. Attempt unauthenticated access: should fail
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "deny unauthenticated moderator postVotes index",
    async () => {
      await api.functional.communityPlatform.moderator.postVotes.index(
        unauthConnection,
        {
          body: typia.random<ICommunityPlatformPostVote.IRequest>(),
        },
      );
    },
  );

  // 3. Authenticated search: returns valid results and respects filters
  // Use random but valid request data for search permutation
  const searchBody = typia.random<ICommunityPlatformPostVote.IRequest>();
  const result =
    await api.functional.communityPlatform.moderator.postVotes.index(
      connection,
      { body: searchBody },
    );
  typia.assert(result);
  TestValidator.predicate(
    "result should have correct pagination",
    typeof result.pagination.current === "number" &&
      result.pagination.current >= 0 &&
      result.pagination.limit > 0 &&
      result.pagination.records >= 0 &&
      result.pagination.pages >= 0,
  );
  TestValidator.equals(
    "pagination reflects input limit",
    result.pagination.limit,
    searchBody.limit ?? result.pagination.limit,
  );

  // 4. Test combinations of filters (user_id, post_id, vote_type, date range, include_deleted, sort_by, sort_order, pagination)
  // Test all filters together
  const complexSearch: ICommunityPlatformPostVote.IRequest = {
    user_id: typia.random<string & tags.Format<"uuid">>(),
    post_id: typia.random<string & tags.Format<"uuid">>(),
    vote_type: RandomGenerator.pick(["up", "down"] as const),
    created_from: new Date(Date.now() - 7 * 86400000).toISOString(), // 7 days ago
    created_to: new Date().toISOString(),
    include_deleted: true,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    sort_by: RandomGenerator.pick([
      "created_at",
      "updated_at",
      "vote_type",
    ] as const),
    sort_order: RandomGenerator.pick(["asc", "desc"] as const),
  };
  const filteredResult =
    await api.functional.communityPlatform.moderator.postVotes.index(
      connection,
      { body: complexSearch },
    );
  typia.assert(filteredResult);
  TestValidator.equals(
    "pagination page matches filter",
    filteredResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "result page size <= limit",
    filteredResult.data.length <= 10,
  );
  // For each result, check that vote_type/filter fields match query if not null/undefined
  if (complexSearch.vote_type) {
    filteredResult.data.forEach((vote) => {
      TestValidator.equals(
        "vote_type matches filter",
        vote.vote_type,
        complexSearch.vote_type,
      );
    });
  }
  if (complexSearch.user_id) {
    filteredResult.data.forEach((vote) => {
      TestValidator.equals(
        "user_id matches filter",
        vote.user.id,
        complexSearch.user_id,
      );
    });
  }
  if (complexSearch.post_id) {
    filteredResult.data.forEach((vote) => {
      TestValidator.equals(
        "post_id matches filter",
        vote.post.id,
        complexSearch.post_id,
      );
    });
  }
  // 5. Test empty result and page out of bounds
  const outOfBoundsSearch: ICommunityPlatformPostVote.IRequest = {
    page: 9999 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  };
  const outResult =
    await api.functional.communityPlatform.moderator.postVotes.index(
      connection,
      { body: outOfBoundsSearch },
    );
  typia.assert(outResult);
  TestValidator.equals(
    "empty data when page out of bounds",
    outResult.data.length,
    0,
  );
}
