import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_reddit_community_post_deletion_by_registered_user(
  connection: api.IConnection,
) {
  // 1. Register a new user account
  const joinBody = {
    typeName: "IRedditCommunityRegisteredUser.IJoin",
    email: `user${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "TestPassword123!",
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/referrer",
  } satisfies IRedditCommunityRegisteredUser.IJoin;

  const user: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: joinBody,
    });
  typia.assert(user);

  // 2. Create a new community
  const communityBody = {
    communityName: `community_${RandomGenerator.alphaNumeric(6)}`,
    description: "Community created for e2e test of post deletion",
    status: "active",
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.registeredUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 3. Create a new post in the community
  const postBody = {
    community_code: community.communityName,
    title: "E2E Test Post Title",
    type: "text",
    content:
      "This is a test post created for testing post deletion by registered user.",
  } satisfies IRedditCommunityPost.ICreate;

  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.registeredUser.posts.create(
      connection,
      { body: postBody },
    );
  typia.assert(post);

  // 4. Delete the post by the registered user
  await api.functional.redditCommunity.registeredUser.posts.erase(connection, {
    postId: post.id,
  });

  // No direct API to check deletion, but subsequent operations
  // trying to access the post should fail (omitted here, beyond scope)
}
