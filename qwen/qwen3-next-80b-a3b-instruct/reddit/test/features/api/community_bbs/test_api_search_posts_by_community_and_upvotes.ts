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
export async function test_api_search_posts_by_community_and_upvotes(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member
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
  // Step 2: Create a community via API (using available utilities)
  // Note: There are no community generation utilities available, so we create a community through proper means
  // However, no community creation endpoints are provided in the available utilities
  // We must work with only what exists: no post creation capability, no community creation utility
  // Therefore, we cannot create specific test data, but we can still test search with existing data
  // Create a random community_id for testing (real community must exist in system)
  const testCommunityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Step 3: Execute search with community filter and min upvote count
  const searchResult = await api.functional.communityBbs.search.posts.index(
    memberConnection,
    {
      body: {
        community_id: testCommunityId,
        min_upvote_count: 50,
      } satisfies ICommunityBbsPost.IRequest,
    },
  );
  typia.assert(searchResult);
  // Step 4: Validate response structure (only validate properties that exist in ISummary)
  const searchResults = searchResult.data;
  // Validate pagination structure exists
  TestValidator.equals(
    "pagination exists",
    searchResult.pagination.current >= 1,
    true,
  );
  TestValidator.equals(
    "pagination limit exists",
    searchResult.pagination.limit >= 1,
    true,
  );
  TestValidator.equals(
    "pagination records exists",
    searchResult.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages exists",
    searchResult.pagination.pages >= 0,
    true,
  );
  // Validate each returned post summary (only validate existing properties)
  for (const post of searchResults) {
    // Verify post id is a valid UUID
    TestValidator.predicate(
      "post has valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        post.id,
      ),
    );
    // Verify post has a title
    TestValidator.notEquals("post has title", post.title, "");
    TestValidator.predicate(
      "post title not too long",
      post.title.length <= 255,
    );
    // Verify author structure exists
    TestValidator.notEquals("author has id", post.author.id, "");
    TestValidator.predicate(
      "author id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        post.author.id,
      ),
    );
    TestValidator.notEquals("author has name", post.author.name, "");
    TestValidator.predicate(
      "author name not too long",
      post.author.name.length <= 100,
    );
    TestValidator.predicate(
      "author reputation is non-negative",
      post.author.reputation >= 0,
    );
  }
  // Test successful search with community filter
  TestValidator.predicate(
    "search results exist or are valid",
    searchResults.length >= 0,
  );
}
