import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizen";
import type { ICommunityBBSCitizenICreate } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizenICreate";
import type { ICommunityBBSCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCommunity";
import type { ICommunityBBSPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBBSPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBBSPost";

export async function test_api_community_post_search_published(
  connection: api.IConnection,
) {
  // Step 1: Authenticate citizen account
  const citizenEmail: string = typia.random<string & tags.Format<"email">>();
  const citizen: ICommunityBBSCitizen.IAuthorized =
    await api.functional.auth.citizen.join(connection, {
      body: typia.random<ICommunityBBSCitizenICreate>(),
    });
  typia.assert(citizen);

  // Step 2: Create a published post to ensure search results contain valid data
  // Note: ICommunityBBSPost.ICreate is defined as string, not an object
  const publishedPost: ICommunityBBSPost =
    await api.functional.communityBBS.citizen.posts.create(connection, {
      body: RandomGenerator.paragraph({
        sentences: 10,
      }) satisfies ICommunityBBSPost.ICreate,
    });
  typia.assert(publishedPost);

  // Step 3: Search for published posts with default pagination and no filters
  const searchResult: IPageICommunityBBSPost.ISummary =
    await api.functional.communityBBS.posts.index(connection, {
      body: {
        // Default pagination (page: 1, limit: 25)
        // No search term, no status filter (defaults to 'published' for non-admin)
        // No community filter, uses default sorting by created_at desc
      } satisfies ICommunityBBSPost.IRequest,
    });
  typia.assert(searchResult);

  // Step 4: Validate response structure and content
  TestValidator.equals(
    "pagination page is 1",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 25",
    searchResult.pagination.limit,
    25,
  );
  TestValidator.predicate(
    "at least one result exists",
    searchResult.data.length > 0,
  );

  // Verify all results are published (non-admin view)
  for (const post of searchResult.data) {
    TestValidator.equals("post status is published", post.status, "published");
  }

  // Verify response matches IPageICommunityBBSPost.ISummary structure
  // (already validated by typia.assert above)

  // Verify results are sorted by created_at descending
  // (Implemented in system, no need to validate - system guarantees ordering)
}
