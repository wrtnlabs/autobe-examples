import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
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
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

/**
 * Test authorization failure when a non-author member attempts to update another user's post.
 * This validates the business rule that only the original post author can edit their posts.
 *
 * Test Flow:
 * 1. Member A (post author) registers and logs in
 * 2. Member A creates a community
 * 3. Member A subscribes to the community
 * 4. Member A creates a text post in the community
 * 5. Member B (different account) registers and logs in
 * 6. Member B subscribes to the same community
 * 7. Member B attempts to update Member A's post - should fail with authorization error
 */
export async function test_api_post_update_by_non_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A (post author) setup
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAAuth);
  // 2. Member A creates a community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberAConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Member A subscribes to the community
  const memberASubscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      memberAConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(memberASubscription);
  // 4. Member A creates a text post
  const post = await api.functional.redditCommunity.member.posts.create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Member B (non-author) setup
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberBAuth);
  // 6. Member B subscribes to the same community
  const memberBSubscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      memberBConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(memberBSubscription);
  // 7. Member B attempts to update Member A's post - should fail with authorization error
  const newTitle = RandomGenerator.paragraph({ sentences: 1 });
  const newContent = RandomGenerator.content({ paragraphs: 1 });
  await TestValidator.error("non-author cannot update post", async () => {
    await api.functional.redditCommunity.member.posts.update(
      memberBConnection,
      {
        postId: post.id,
        body: {
          title: newTitle,
          text_content: newContent,
        } satisfies IRedditCommunityPost.IUpdate,
      },
    );
  });
}
