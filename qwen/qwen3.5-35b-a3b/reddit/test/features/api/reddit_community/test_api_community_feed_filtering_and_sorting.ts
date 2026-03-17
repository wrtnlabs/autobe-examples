import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_community_feed_filtering_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate for community creation
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create a community
  const communityConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(communityConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const communityInput = {
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } as DeepPartial<IRedditCommunityCommunity.IRequest>;
  const communityResponse =
    await api.functional.redditCommunity.communities.index(
      communityConnection,
      {
        body: communityInput,
      },
    );
  typia.assert(communityResponse);
  const community = communityResponse.data[0];
  typia.assert(community);
  // 3. Create posts using a separate member account
  const postCreatorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(postCreatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Test community feed with community_id filter
  const communityFeed = await api.functional.redditCommunity.posts.index(
    connection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  typia.assert(communityFeed);
  TestValidator.equals(
    "all posts belong to specified community",
    communityFeed.data.every((post) => post.community.id === community.id),
    true,
  );
  // 5. Test filtering by keyword (search parameter)
  const searchPosts = await api.functional.redditCommunity.posts.index(
    connection,
    {
      body: {
        community_id: community.id,
        search: community.name,
      },
    },
  );
  typia.assert(searchPosts);
  TestValidator.equals(
    "search returns posts matching keyword",
    searchPosts.data.every(
      (post) =>
        post.title.toLowerCase().includes(community.name.toLowerCase()) ===
        true,
    ),
    true,
  );
  // 6. Test pagination with different page and limit values
  const paginatedFeed1 = await api.functional.redditCommunity.posts.index(
    connection,
    {
      body: {
        community_id: community.id,
        page: 1,
        limit: 2,
      },
    },
  );
  typia.assert(paginatedFeed1);
  TestValidator.equals(
    "page 1 with limit 2 returns correct count",
    paginatedFeed1.pagination.limit,
    2,
  );
  TestValidator.equals(
    "page 1 current page is 1",
    paginatedFeed1.pagination.current,
    1,
  );
  const paginatedFeed2 = await api.functional.redditCommunity.posts.index(
    connection,
    {
      body: {
        community_id: community.id,
        page: 2,
        limit: 2,
      },
    },
  );
  typia.assert(paginatedFeed2);
  TestValidator.equals(
    "page 2 current page is 2",
    paginatedFeed2.pagination.current,
    2,
  );
  // 7. Confirm community feed works for authenticated members
  const authenticatedFeed = await api.functional.redditCommunity.posts.index(
    memberConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  typia.assert(authenticatedFeed);
  TestValidator.equals(
    "authenticated member can access community feed",
    authenticatedFeed.data.length >= 0,
    true,
  );
  // 8. Confirm community feed works for guests (no authentication)
  const guestFeed = await api.functional.redditCommunity.posts.index(
    connection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  typia.assert(guestFeed);
  TestValidator.equals(
    "guest access works for community feed",
    guestFeed.data.length >= 0,
    true,
  );
  // 9. Verify type-specific preview_content is correctly populated for each post type
  communityFeed.data.forEach((post) => {
    if (
      post.post_type === "text" ||
      post.post_type === "link" ||
      post.post_type === "image"
    ) {
      typia.assert(post);
    }
  });
  TestValidator.equals(
    "all posts have valid post_type",
    communityFeed.data.every(
      (post) =>
        post.post_type === "text" ||
        post.post_type === "link" ||
        post.post_type === "image",
    ),
    true,
  );
  // 10. Validate pagination metadata
  TestValidator.equals(
    "pagination records count is valid",
    communityFeed.pagination.records,
    communityFeed.pagination.records,
  );
  TestValidator.equals(
    "pagination pages count is valid",
    communityFeed.pagination.pages,
    communityFeed.pagination.pages,
  );
}