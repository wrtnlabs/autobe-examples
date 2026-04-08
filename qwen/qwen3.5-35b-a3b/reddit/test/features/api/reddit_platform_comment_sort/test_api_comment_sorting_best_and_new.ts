import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformComment";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import type { IRedditPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostLink";
import type { IRedditPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostText";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSubscription";
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

export async function test_api_comment_sorting_best_and_new(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // 2. Create authenticated connection using member token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: member.token.access },
  };
  // 3. Create community
  const community =
    await api.functional.redditPlatform.member.communities.create(
      authenticatedConnection,
      {
        body: {
          name:
            RandomGenerator.alphaNumeric(8) +
            "_" +
            RandomGenerator.alphaNumeric(4),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 4. Subscribe member to community
  await api.functional.redditPlatform.member.communities.subscribe(
    authenticatedConnection,
    {
      communityName: community.name,
    },
  );
  // 5. Create a post in the community
  const post = await api.functional.redditPlatform.member.posts.create(
    authenticatedConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.name(3),
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  // 6. Test 'best' sorting (empty comments due to no comment creation endpoint)
  const bestSortResponse =
    await api.functional.redditPlatform.member.posts.comments.sort(
      authenticatedConnection,
      {
        postId: post.id,
        body: {
          sort: "best",
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(bestSortResponse);
  // 7. Validate 'best' sort pagination structure
  TestValidator.equals(
    "best sort current page",
    bestSortResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "best sort limit",
    bestSortResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "best sort total records",
    bestSortResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "best sort total pages",
    bestSortResponse.pagination.pages,
    0,
  );
  TestValidator.equals("best sort data array", bestSortResponse.data, []);
  // 8. Test 'new' sorting
  const newSortResponse =
    await api.functional.redditPlatform.member.posts.comments.sort(
      authenticatedConnection,
      {
        postId: post.id,
        body: {
          sort: "new",
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(newSortResponse);
  // 9. Validate 'new' sort pagination structure
  TestValidator.equals(
    "new sort current page",
    newSortResponse.pagination.current,
    1,
  );
  TestValidator.equals("new sort limit", newSortResponse.pagination.limit, 20);
  TestValidator.equals(
    "new sort total records",
    newSortResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "new sort total pages",
    newSortResponse.pagination.pages,
    0,
  );
  TestValidator.equals("new sort data array", newSortResponse.data, []);
  // 10. Test with different pagination parameters
  const paginatedSortResponse =
    await api.functional.redditPlatform.member.posts.comments.sort(
      authenticatedConnection,
      {
        postId: post.id,
        body: {
          sort: "best",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(paginatedSortResponse);
  TestValidator.equals(
    "custom limit pagination",
    paginatedSortResponse.pagination.limit,
    10,
  );
}