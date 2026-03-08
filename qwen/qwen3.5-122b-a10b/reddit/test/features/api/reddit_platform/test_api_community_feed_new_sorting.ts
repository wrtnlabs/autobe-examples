import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
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
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

/**
 * Test querying a community feed with new sorting to retrieve the most recent posts first.
 *
 * The scenario:
 * 1. Create a test member account and authenticate
 * 2. Create a test community
 * 3. Query the community feed with sort_by='new' parameter
 * 4. Verify posts are returned in reverse chronological order (newest first)
 * 5. Verify pagination metadata is correct
 * 6. Verify each post summary includes required fields
 */
export async function test_api_community_feed_new_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(
        typia.random<string & tags.Format<"email">>(),
      ),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a test community
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
  // 3. Query the community feed with new sorting
  const feedResponse =
    await api.functional.redditPlatform.feeds.community.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          sort_by: "new",
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformPost.IRequest,
      },
    );
  typia.assert(feedResponse);
  // 4. Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    feedResponse.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", feedResponse.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records non-negative",
    feedResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    feedResponse.pagination.pages >= 0,
  );
  // 5. Verify posts are sorted by created_at descending (newest first)
  if (feedResponse.data.length > 1) {
    for (let i = 0; i < feedResponse.data.length - 1; i++) {
      const currentPost = feedResponse.data[i];
      const nextPost = feedResponse.data[i + 1];
      TestValidator.predicate(
        `post ${i} created_at >= post ${i + 1} created_at (newest first)`,
        currentPost.created_at >= nextPost.created_at,
      );
    }
  }
  // 6. Verify each post summary has required business logic fields
  for (const post of feedResponse.data) {
    // Verify post content exists
    TestValidator.predicate("post has id", post.id.length > 0);
    TestValidator.predicate("post has title", post.title.length > 0);
    TestValidator.predicate(
      "post has author username",
      post.author.username.length > 0,
    );
    TestValidator.predicate(
      "post has community name",
      post.community.name.length > 0,
    );
    TestValidator.predicate("post has created_at", post.created_at.length > 0);
    TestValidator.predicate("post has post_type", post.post_type.length > 0);
    TestValidator.predicate("post has preview", post.preview.length >= 0);
    // Verify author information
    TestValidator.predicate("author has id", post.author.id.length > 0);
    TestValidator.predicate(
      "author has created_at",
      post.author.created_at.length > 0,
    );
    // Verify community information
    TestValidator.predicate("community has id", post.community.id.length > 0);
    TestValidator.predicate(
      "community has created_at",
      post.community.created_at.length > 0,
    );
    // Verify preview length for text posts (should be max 200 characters)
    if (post.post_type === "text") {
      TestValidator.predicate(
        "text post preview max 200 chars",
        post.preview.length <= 200,
      );
    }
  }
}