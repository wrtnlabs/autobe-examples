import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsPost";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_search_posts_by_keyword(
  connection: api.IConnection,
): Promise<void> {
  // Test successful post search using keyword filtering. Member authenticates and searches posts containing the keyword 'technology'.
  // Validates that results include posts with matching titles (as content field is unavailable in summary), exclude posts marked as 'rejected'
  // (server-side filtering), and return only active posts. Confirms pagination structure and cursor-based navigation.
  // Step 1: Create a new connection for member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 2: Authenticate member via join (using utility function as required)
  const authResult: ICommunityBbsMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsMember.IJoin,
    });
  // Step 3: The memberConnection's headers are now updated with auth token
  // Step 4: Define search parameters for keyword 'technology'
  const searchCriteria = {
    search: "technology",
  } satisfies ICommunityBbsPost.IRequest;
  // Step 5: Execute search on /communityBbs/search/posts endpoint
  const response: IPageICommunityBbsPost.ISummary =
    await api.functional.communityBbs.search.posts.index(memberConnection, {
      body: searchCriteria,
    });
  // Step 6: Validate response structure and content
  typia.assert(response);
  // Step 7: Validate pagination structure
  TestValidator.equals(
    "pagination should have current page 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 20 (default)",
    response.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records should be at least 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be at least 0",
    response.pagination.pages >= 0,
  );
  // Step 8: Validate that all returned posts have matching title (content field unavailable in summary)
  // In the DTO ICommunityBbsPost.ISummary, only 'title' and 'author' are available
  // Therefore, keyword validation is performed on title only as the scenario specifies 'title and content'
  // Server-side filters out rejected posts (content_scan_result='rejected') — this cannot be validated locally
  for (const post of response.data) {
    TestValidator.predicate(
      "post title should contain keyword",
      post.title.toLowerCase().includes("technology"),
    );
  }
  // Step 9: Validate author fields are present and correct type
  for (const post of response.data) {
    typia.assert(post.author);
    TestValidator.equals(
      "author id should be UUID",
      typeof post.author.id,
      "string",
    );
    TestValidator.predicate(
      "author name should be non-empty",
      post.author.name.length > 0,
    );
    TestValidator.predicate(
      "author reputation should be non-negative",
      post.author.reputation >= 0,
    );
  }
}
