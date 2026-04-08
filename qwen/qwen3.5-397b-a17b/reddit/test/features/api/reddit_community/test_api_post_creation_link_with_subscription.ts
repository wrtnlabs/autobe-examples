import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImageContent";
import type { IRedditCommunityPostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostLinkContent";
import type { IRedditCommunityPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostTextContent";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_member_subscriptions_create";
import { generate_random_reddit_community_posts_create } from "../../../generate/generate_random_reddit_community_posts_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

/**
 * Test successful creation of a link post by a subscribed member.
 *
 * Validates the complete link post creation workflow including member authentication, community creation, subscription establishment, and link post creation. Ensures that the link post correctly stores the URL and that the backend automatically extracts the domain name from the provided URL.
 *
 * Special attention is given to verifying that the postType is correctly set to 'link', the content structure contains both url and domain fields, and the domain is accurately extracted from the URL (e.g., 'youtube.com' from 'https://youtube.com/watch?v=abc123').
 *
 * 1. Member registers and authenticates with randomized credentials.
 * 2. Member creates a community and becomes the owner.
 * 3. Member subscribes to the created community (required for posting).
 * 4. Member creates a link post with valid title, URL, and community_id.
 * 5. Validates post entity structure including postType='link', content.url, content.domain.
 * 6. Validates domain extraction accuracy from the provided URL.
 * 7. Validates metadata correctness (author, community, voteScore=0, commentsCount=0).
 */
export async function test_api_post_creation_link_with_subscription(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create community owned by the member
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe member to the community (required for posting)
  const subscription =
    await generate_random_reddit_community_member_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create link post with valid URL
  const testUrl = "https://youtube.com/watch?v=dQw4w9WgXcQ";
  const expectedDomain = "youtube.com";
  const post = await api.functional.redditCommunity.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "link",
        community_id: community.id,
        url: testUrl,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Validate post type is 'link'
  TestValidator.equals("postType is link", post.postType, "link");
  // 6. Validate content exists and narrow type to IRedditCommunityPostLinkContent
  const content = typia.assert<IRedditCommunityPostLinkContent>(post.content!);
  // 7. Validate URL matches input and domain is correctly extracted
  TestValidator.equals("url matches input", content.url, testUrl);
  TestValidator.equals(
    "domain extracted correctly",
    content.domain,
    expectedDomain,
  );
  // 8. Validate metadata correctness (business logic, not type validation)
  TestValidator.equals("author matches member", post.author.id, memberAuth.id);
  TestValidator.equals(
    "community matches created",
    post.community.id,
    community.id,
  );
  TestValidator.equals("voteScore starts at 0", post.voteScore, 0);
  TestValidator.equals("commentsCount starts at 0", post.commentsCount, 0);
}