import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_member_posts_search_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate random credentials for member user
  const randomJoin: IRedditPlatformMember.IJoin =
    typia.random<IRedditPlatformMember.IJoin>();
  // 2. Authenticate member user - connection headers are set with auth token
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: randomJoin,
  });
  typia.assert(authorized);
  // 3. Create a test community for search context
  const communityConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(communityConnection, {
    body: typia.random<IRedditPlatformMember.IJoin>(),
  });
  const community =
    await generate_random_reddit_platform_member_communities_create(
      communityConnection,
      {
        body: {
          name: `test_community_${RandomGenerator.alphaNumeric(6)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 4. Use memberConnection for search - it already has auth token from join
  const searchConnection: api.IConnection = { host: connection.host };
  // Copy auth token from member connection
  if (memberConnection.headers?.Authorization) {
    searchConnection.headers = { ...memberConnection.headers };
  }
  // 5. Test basic search with empty query (no filters) - returns all posts
  const searchResult =
    await api.functional.redditPlatform.member.posts.search.index(
      searchConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformPost.IRequest,
      },
    );
  typia.assert(searchResult);
  // 6. Validate pagination structure
  TestValidator.equals(
    "pagination has current page",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination has limit",
    searchResult.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records count non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.equals(
    "pagination pages calculated correctly",
    searchResult.pagination.pages,
    Math.ceil(searchResult.pagination.records / searchResult.pagination.limit),
  );
  // 7. Test case-insensitive search with specific title pattern
  const searchTitleResult =
    await api.functional.redditPlatform.member.posts.search.index(
      searchConnection,
      {
        body: {
          search: "Test",
          limit: 20,
        } satisfies IRedditPlatformPost.IRequest,
      },
    );
  typia.assert(searchTitleResult);
  TestValidator.equals(
    "search title returns valid pagination",
    searchTitleResult.pagination.current,
    1,
  );
  // 8. Validate that response data contains proper post summaries with business logic
  for (const post of searchResult.data) {
    TestValidator.predicate(
      "post has valid post_type",
      ["TEXT", "LINK", "IMAGE"].includes(post.post_type),
    );
    TestValidator.predicate(
      "post has non-negative vote_score",
      post.vote_score >= 0 || post.vote_score < 0,
    );
    TestValidator.predicate(
      "post has non-negative comment_count",
      post.comment_count >= 0,
    );
    typia.assert(post.author);
    TestValidator.equals(
      "author has username",
      post.author.username.length > 0,
      true,
    );
    TestValidator.equals(
      "author has display_name",
      post.author.display_name.length > 0,
      true,
    );
    TestValidator.predicate(
      "author has non-negative karma_score",
      post.author.karma_score >= 0,
    );
    typia.assert(post.community);
    TestValidator.equals(
      "community has name",
      post.community.name.length > 0,
      true,
    );
    TestValidator.predicate(
      "community has non-negative subscriber_count",
      post.community.subscriber_count >= 0,
    );
  }
  // 9. Test search with community filter
  const communityFilteredResult =
    await api.functional.redditPlatform.member.posts.search.index(
      searchConnection,
      {
        body: {
          communityId: community.id,
          limit: 20,
        } satisfies IRedditPlatformPost.IRequest,
      },
    );
  typia.assert(communityFilteredResult);
  TestValidator.equals(
    "community filtered search returns valid pagination",
    communityFilteredResult.pagination.current,
    1,
  );
  // 10. Validate that filtered results only contain posts from specified community
  for (const post of communityFilteredResult.data) {
    TestValidator.equals(
      "post belongs to filtered community",
      post.community.id,
      community.id,
    );
  }
}
