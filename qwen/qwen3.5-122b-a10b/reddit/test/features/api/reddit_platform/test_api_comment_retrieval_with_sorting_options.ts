import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformComment";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_comment_retrieval_with_sorting_options(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create community
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create post in community
  const post = await generate_random_reddit_platform_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.name(3),
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Test 'best' sorting (highest vote_score first)
  // Note: No comments exist yet, so this will return empty array
  const bestSorted = await api.functional.redditPlatform.posts.comments.index(
    memberConnection,
    {
      postId: post.id,
      body: {
        sort: "best",
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformComment.IRequest,
    },
  );
  typia.assert(bestSorted);
  TestValidator.equals("best sorting returns data", bestSorted.data.length, 0);
  TestValidator.equals(
    "pagination current page",
    bestSorted.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit value",
    bestSorted.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination records count",
    bestSorted.pagination.records,
    0,
  );
  // 5. Test 'new' sorting (most recent first)
  const newSorted = await api.functional.redditPlatform.posts.comments.index(
    memberConnection,
    {
      postId: post.id,
      body: {
        sort: "new",
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformComment.IRequest,
    },
  );
  typia.assert(newSorted);
  TestValidator.equals("new sorting returns data", newSorted.data.length, 0);
  TestValidator.equals(
    "new sorting pagination records",
    newSorted.pagination.records,
    0,
  );
  // 6. Test 'controversial' sorting
  const controversialSorted =
    await api.functional.redditPlatform.posts.comments.index(memberConnection, {
      postId: post.id,
      body: {
        sort: "controversial",
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformComment.IRequest,
    });
  typia.assert(controversialSorted);
  TestValidator.equals(
    "controversial sorting returns data",
    controversialSorted.data.length,
    0,
  );
  TestValidator.equals(
    "controversial sorting pagination records",
    controversialSorted.pagination.records,
    0,
  );
  // 7. Test pagination with sorting (limit parameter)
  const paginated = await api.functional.redditPlatform.posts.comments.index(
    memberConnection,
    {
      postId: post.id,
      body: {
        sort: "new",
        page: 1,
        limit: 2,
      } satisfies IRedditPlatformComment.IRequest,
    },
  );
  typia.assert(paginated);
  TestValidator.equals("pagination limit works", paginated.data.length, 0);
  TestValidator.equals(
    "pagination current page value",
    paginated.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit value", paginated.pagination.limit, 2);
  // 8. Test default sorting (undefined sort should default to 'best')
  const defaultSorted =
    await api.functional.redditPlatform.posts.comments.index(memberConnection, {
      postId: post.id,
      body: {
        sort: undefined,
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformComment.IRequest,
    });
  typia.assert(defaultSorted);
  TestValidator.equals(
    "default sorting returns data",
    defaultSorted.data.length,
    0,
  );
  TestValidator.equals(
    "default sorting pagination records",
    defaultSorted.pagination.records,
    0,
  );
  // 9. Test pagination with page parameter
  const pageTwo = await api.functional.redditPlatform.posts.comments.index(
    memberConnection,
    {
      postId: post.id,
      body: {
        sort: "best",
        page: 2,
        limit: 10,
      } satisfies IRedditPlatformComment.IRequest,
    },
  );
  typia.assert(pageTwo);
  TestValidator.equals("page 2 current page", pageTwo.pagination.current, 2);
  TestValidator.equals("page 2 has data", pageTwo.data.length, 0);
  // 10. Validate response structure consistency across all sorting options
  const allResponses = [
    bestSorted,
    newSorted,
    controversialSorted,
    defaultSorted,
  ];
  for (const response of allResponses) {
    TestValidator.predicate(
      "response has pagination",
      response.pagination !== undefined,
    );
    TestValidator.predicate(
      "pagination has current",
      response.pagination.current !== undefined,
    );
    TestValidator.predicate(
      "pagination has limit",
      response.pagination.limit !== undefined,
    );
    TestValidator.predicate(
      "pagination has records",
      response.pagination.records !== undefined,
    );
    TestValidator.predicate(
      "pagination has pages",
      response.pagination.pages !== undefined,
    );
    TestValidator.predicate(
      "response has data array",
      Array.isArray(response.data),
    );
  }
}
