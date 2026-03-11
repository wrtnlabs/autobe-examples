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

export async function test_api_post_listing_community_filtering_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.alphaNumeric(10);
  const password = RandomGenerator.alphaNumeric(12);
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email,
      username,
      password,
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://example.com",
      referrer: "https://referrer.example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create a new community with authenticated member connection
  const communityConnection: api.IConnection = { host: connection.host };
  await api.functional.redditPlatform.auth.member.login(communityConnection, {
    body: {
      email,
      password,
    },
  });
  typia.assert(memberAuth.token);
  const community =
    await api.functional.redditPlatform.member.communities.create(
      communityConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // 3. Query posts filtered by the created community
  const postsWithFilter = await api.functional.redditPlatform.posts.index(
    communityConnection,
    {
      body: {
        communityId: community.id,
        page: 1,
        limit: 20,
      },
    },
  );
  typia.assert(postsWithFilter);
  // 4. Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    postsWithFilter.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    postsWithFilter.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    postsWithFilter.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    postsWithFilter.pagination.pages ===
      Math.ceil(
        postsWithFilter.pagination.records / postsWithFilter.pagination.limit,
      ),
  );
  // 5. Test with different limit value
  const postsWithLargerLimit = await api.functional.redditPlatform.posts.index(
    communityConnection,
    {
      body: {
        communityId: community.id,
        page: 1,
        limit: 50,
      },
    },
  );
  typia.assert(postsWithLargerLimit);
  TestValidator.equals(
    "larger limit pagination limit",
    postsWithLargerLimit.pagination.limit,
    50,
  );
  // 6. Test non-existent communityId
  const nonExistentCommunityId = typia.random<string & tags.Format<"uuid">>();
  const postsFromNonExistent = await api.functional.redditPlatform.posts.index(
    communityConnection,
    {
      body: {
        communityId: nonExistentCommunityId,
        page: 1,
        limit: 20,
      },
    },
  );
  typia.assert(postsFromNonExistent);
  TestValidator.equals(
    "non-existent community records",
    postsFromNonExistent.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent community pages",
    postsFromNonExistent.pagination.pages,
    0,
  );
  TestValidator.equals(
    "non-existent community data",
    postsFromNonExistent.data.length,
    0,
  );
  // 7. Test page 2 with existing community
  const postsPage2 = await api.functional.redditPlatform.posts.index(
    communityConnection,
    {
      body: {
        communityId: community.id,
        page: 2,
        limit: 10,
      },
    },
  );
  typia.assert(postsPage2);
  TestValidator.equals(
    "page 2 pagination current",
    postsPage2.pagination.current,
    2,
  );
}
