import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsTrendingContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsTrendingContent";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsTrendingContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsTrendingContent";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_trending_posts_pagination_with_offset(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member to access trending content endpoint
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityBbsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsMember.IJoin,
    },
  );
  typia.assert(member);
  // Step 2: Retrieve first page of trending posts (fixed limit=20, no offset parameter supported)
  const firstPage: IPageICommunityBbsTrendingContent =
    await api.functional.communityBbs.member.analytics.posts.trending.index(
      memberConnection,
    );
  typia.assert(firstPage);
  // Step 3: Retrieve second page of trending posts (same request, should return same data due to caching)
  const secondPage: IPageICommunityBbsTrendingContent =
    await api.functional.communityBbs.member.analytics.posts.trending.index(
      memberConnection,
    );
  typia.assert(secondPage);
  // Step 4: Validate pagination metadata matches expected values based on API implementation
  // The API uses a fixed limit of 20 and no offset parameter - pagination is handled server-side
  TestValidator.equals(
    "current page should be 1",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals("limit should be 20", firstPage.pagination.limit, 20);
  TestValidator.equals(
    "current page should be 1 on second call",
    secondPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be 20 on second call",
    secondPage.pagination.limit,
    20,
  );
  // Step 5: Verify that the API returns consistent results on subsequent calls (cache validation)
  // Due to materialized view implementation, repeated calls return identical results
  TestValidator.equals(
    "first page data should equal second page data (cache)",
    firstPage.data,
    secondPage.data,
  );
  // Step 6: Validate that data array contains exactly 20 items or fewer (as per spec)
  TestValidator.predicate(
    "data array length should not exceed limit of 20",
    firstPage.data.length <= 20,
  );
  // Step 7: Validate pagination total records and pages are non-negative
  TestValidator.predicate(
    "total records should be non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be non-negative",
    firstPage.pagination.pages >= 0,
  );
  // Step 8: Validate data structure and sorting consistency
  // Sort by trending_score descending, then by published_at descending (tie breaker)
  for (let i = 0; i < firstPage.data.length - 1; i++) {
    const curr = firstPage.data[i];
    const next = firstPage.data[i + 1];
    if (curr.trending_score === next.trending_score) {
      TestValidator.predicate(
        `post ${i} published_at should be >= post ${i + 1} published_at when trending_score equal`,
        new Date(curr.published_at) >= new Date(next.published_at),
      );
    } else {
      TestValidator.predicate(
        `post ${i} trending_score should be >= post ${i + 1} trending_score`,
        curr.trending_score >= next.trending_score,
      );
    }
  }
  // Step 9: Validate data integrity using typia.assert() - no additional validation needed
  // typia.assert() already validates all types, formats, and constraints
  // No additional regex, type checks, or validations needed after typia.assert()
}
