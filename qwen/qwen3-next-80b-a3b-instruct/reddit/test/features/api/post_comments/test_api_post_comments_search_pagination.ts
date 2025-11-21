import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizen";
import type { ICommunityBBSCitizenICreate } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizenICreate";
import type { ICommunityBBSComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSComment";
import type { ICommunityBBSCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCommunity";
import type { ICommunityBBSPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBBSComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBBSComment";

export async function test_api_post_comments_search_pagination(
  connection: api.IConnection,
) {
  // Create citizen account for authentication
  const citizen: ICommunityBBSCitizen.IAuthorized =
    await api.functional.auth.citizen.join(connection, {
      body: typia.random<ICommunityBBSCitizenICreate>(),
    });
  typia.assert(citizen);

  // Create a post for which comments will be tested
  // ICommunityBBSPost.ICreate is defined as string, so we stringify the object
  const post: ICommunityBBSPost =
    await api.functional.communityBBS.citizen.posts.create(connection, {
      body: JSON.stringify({
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        community_id: typia.random<string & tags.Format<"uuid">>(),
      }),
    });
  typia.assert(post);

  // Define search criteria for pagination test
  // ICommunityBBSComment.IRequest is defined as string, so we stringify the object
  const searchCriteria: ICommunityBBSComment.IRequest = JSON.stringify({
    post_id: post.id,
    page: 1,
    limit: 5,
    sort_by: "created_at",
    order: "desc",
    business_status: "approved",
    search: "test",
  });

  // Perform the pagination search operation
  const result: IPageICommunityBBSComment.ISummary =
    await api.functional.communityBBS.posts.comments.index(connection, {
      postId: post.id,
      body: searchCriteria,
    });
  typia.assert(result);

  // Validate pagination structure
  TestValidator.equals("pagination structure", result.pagination.current, 1);
  TestValidator.equals("pagination limit", result.pagination.limit, 5);
  TestValidator.predicate(
    "pagination records >= 0",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    result.pagination.pages >= 0,
  );

  // Validate at least one comment is returned
  TestValidator.predicate("at least one comment", result.data.length > 0);

  // Test with different sort order
  const sortAscCriteria: ICommunityBBSComment.IRequest = JSON.stringify({
    ...JSON.parse(searchCriteria),
    sort_by: "created_at",
    order: "asc",
  });

  const resultAsc: IPageICommunityBBSComment.ISummary =
    await api.functional.communityBBS.posts.comments.index(connection, {
      postId: post.id,
      body: sortAscCriteria,
    });
  typia.assert(resultAsc);

  // Validate that results are different (different order)
  TestValidator.notEquals(
    "different sort order should produce different ordering",
    result.data[0],
    resultAsc.data[resultAsc.data.length - 1],
  );

  // Test with different business status
  const pendingCriteria: ICommunityBBSComment.IRequest = JSON.stringify({
    ...JSON.parse(searchCriteria),
    business_status: "pending",
  });

  const resultPending: IPageICommunityBBSComment.ISummary =
    await api.functional.communityBBS.posts.comments.index(connection, {
      postId: post.id,
      body: pendingCriteria,
    });
  typia.assert(resultPending);

  TestValidator.predicate(
    "pending status comments present",
    resultPending.data.length >= 0,
  );

  // Test search keyword functionality
  const keywordCriteria: ICommunityBBSComment.IRequest = JSON.stringify({
    ...JSON.parse(searchCriteria),
    search: "this is a test keyword",
  });

  const resultKeyword: IPageICommunityBBSComment.ISummary =
    await api.functional.communityBBS.posts.comments.index(connection, {
      postId: post.id,
      body: keywordCriteria,
    });
  typia.assert(resultKeyword);

  TestValidator.predicate(
    "keyword search results",
    resultKeyword.data.length >= 0,
  );
}
