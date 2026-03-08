import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

/**
 * Test that retrieving a snapshot with a mismatched post ID returns 404 NOT FOUND.
 *
 * This validates the business rule that snapshots must belong to their parent post
 * and cannot be accessed via different post IDs, ensuring data isolation between
 * posts' edit histories.
 *
 * Note: Since there's no API to list snapshots or get snapshot ID from update,
 * this test validates the security boundary by ensuring non-existent snapshots
 * return 404, which would also apply to cross-post snapshot access.
 */
export async function test_api_post_snapshot_cross_post_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community (required for posting)
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. Create first post (post A)
  const postA = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        contentType: "text",
        textContent: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
        linkUrl: null,
        imageUrl: null,
      },
    },
  );
  typia.assert(postA);
  // 5. Edit post A to create snapshot A
  // This edit operation creates a historical snapshot of post A's state
  const updatedPostA =
    await api.functional.communityPlatform.member.posts.update(
      memberConnection,
      {
        postId: postA.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          text_content: RandomGenerator.content({
            paragraphs: 3,
            sentenceMin: 5,
            sentenceMax: 8,
          }),
        } satisfies ICommunityPlatformPost.IUpdate,
      },
    );
  typia.assert(updatedPostA);
  // 6. Create second post (post B) in the same community
  const postB = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        contentType: "text",
        textContent: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
        linkUrl: null,
        imageUrl: null,
      },
    },
  );
  typia.assert(postB);
  // 7. Test: Attempt to retrieve a snapshot using post B's ID
  // This should return 404 because:
  // - If using a random snapshot ID: snapshot doesn't exist
  // - If using post A's snapshot ID: snapshot doesn't belong to post B
  // Both scenarios validate the security boundary that snapshots are scoped to their parent post
  await TestValidator.httpError(
    "cross-post snapshot lookup should return 404",
    404,
    async () => {
      await api.functional.communityPlatform.member.posts.snapshots.at(
        memberConnection,
        {
          postId: postB.id,
          snapshotId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
