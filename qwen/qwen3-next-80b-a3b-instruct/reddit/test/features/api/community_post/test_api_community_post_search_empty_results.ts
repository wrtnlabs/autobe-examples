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

export async function test_api_community_post_search_empty_results(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as a citizen
  const citizenEmail: string = typia.random<string & tags.Format<"email">>();
  const citizen: ICommunityBBSCitizen.IAuthorized =
    await api.functional.auth.citizen.join(connection, {
      body: typia.random<ICommunityBBSCitizenICreate>(),
    });
  typia.assert(citizen);

  // Step 2: Create multiple community posts with unique content that won't match any search term
  // Note: ICommunityBBSPost.ICreate is defined as string in the DTO schema, so we use a string representation
  const postCount = 3;
  const createdPosts = await ArrayUtil.asyncRepeat(postCount, async (index) => {
    // Since ICommunityBBSPost.ICreate is string type, we create a string content
    // Based on the API description, this should be a simple string representation of the post
    // We'll use a combination of random title and body as a descriptive string
    const title = RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 10,
    });
    const body = RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    });
    const communityId = typia.random<string & tags.Format<"uuid">>();

    // Combine into a single string as required by ICommunityBBSPost.ICreate
    const postString = `title: ${title}, body: ${body}, community_id: ${communityId}`;

    const createdPost = await api.functional.communityBBS.citizen.posts.create(
      connection,
      {
        body: postString, // Uses string type as defined in schema
      },
    );
    typia.assert(createdPost);
    return createdPost;
  });

  // Step 3: Perform a search with a term that doesn't match any created posts
  const searchTerm = "nonexistent-search-term-xyz-789";
  const searchRequest: ICommunityBBSPost.IRequest = {
    search: searchTerm,
    page: 1,
    limit: 10,
  };

  // Step 4: Call the search endpoint and validate response
  const searchResult: IPageICommunityBBSPost.ISummary =
    await api.functional.communityBBS.posts.index(connection, {
      body: searchRequest,
    });
  typia.assert(searchResult);

  // Step 5: Validate that the result contains empty data array and proper pagination metadata
  TestValidator.equals(
    "search result data should be empty",
    searchResult.data.length,
    0,
  );
  TestValidator.equals(
    "pagination current page should be 1",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 10",
    searchResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records should be 0",
    () => searchResult.pagination.records === 0,
  );
  TestValidator.predicate(
    "pagination pages should be 0",
    () => searchResult.pagination.pages === 0,
  );
}
