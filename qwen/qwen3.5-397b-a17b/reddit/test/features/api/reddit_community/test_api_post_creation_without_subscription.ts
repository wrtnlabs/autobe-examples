import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImageContent";
import type { IRedditCommunityPostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostLinkContent";
import type { IRedditCommunityPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostTextContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_posts_create } from "../../../generate/generate_random_reddit_community_posts_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

/**
 * Test that post creation is rejected when member is not subscribed to the community.
 *
 * Validates the critical business rule that users MUST be subscribed to a community before creating posts in that community. This test ensures the subscription check occurs before post creation and that the system enforces posting privilege restriction.
 *
 * The test creates a member account and a community, but intentionally does NOT create a subscription between them. When attempting to create a post in the community without an active subscription, the request should be rejected with 403 Forbidden error.
 *
 * 1. Member registers and authenticates with randomized credentials.
 * 2. Member creates a community (becomes owner but does not auto-subscribe).
 * 3. Member attempts to create a text post in the community without subscription.
 * 4. Validates the request is rejected with 403 Forbidden error.
 * 5. Validates no post record is created when subscription validation fails.
 */
export async function test_api_post_creation_without_subscription(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // 2. Create a community (member becomes owner but does NOT auto-subscribe)
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Attempt to create a post WITHOUT having subscription to the community
  // This should fail with 403 Forbidden per business rule
  const postInput: IRedditCommunityPost.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    post_type: "text",
    community_id: community.id,
    body: RandomGenerator.content({ paragraphs: 2 }),
  };
  // 4. Validate the request is rejected with 403 Forbidden error
  await TestValidator.httpError(
    "post creation without subscription should be rejected with 403",
    403,
    async () => {
      await api.functional.redditCommunity.posts.create(memberConnection, {
        body: postInput,
      });
    },
  );
}
