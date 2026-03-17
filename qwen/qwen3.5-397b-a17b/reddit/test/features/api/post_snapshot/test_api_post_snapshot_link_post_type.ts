import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostSnapshot";
import type { IRedditClonePostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostText";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_posts_snapshots_create } from "../../../generate/generate_random_reddit_clone_member_posts_snapshots_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_snapshot } from "../../../prepare/prepare_random_reddit_clone_post_snapshot";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

/**
 * Test that snapshot creation works correctly for LINK type posts, validating that the snapshot captures the URL content instead of text body.
 *
 * 1. Authenticate as a member via /redditClone/auth/member/join
 * 2. Create a community via /redditClone/communities
 * 3. Subscribe to the community via /redditClone/member/subscriptions
 * 4. Create a LINK type post via /redditClone/member/posts with title and external URL
 * 5. Create a snapshot via the target endpoint
 *
 * Validate that:
 * - The snapshot is created successfully
 * - The snapshot postType is 'LINK'
 * - The snapshot linkUrl contains the exact URL from the original post
 * - The snapshot textContent is null (since it's a LINK post)
 * - The snapshot imageFileId is null
 * - The snapshot title matches the original post title
 * - All relation objects (post, member, community) are correctly populated
 *
 * This validates that the snapshot mechanism correctly handles different post types and captures the appropriate type-specific content.
 */
export async function test_api_post_snapshot_link_post_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a community
  const community = await generate_random_reddit_clone_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditCloneSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create a LINK type post with external URL
  const testUrl = typia.random<string & tags.Format<"uri">>();
  const postTitle = RandomGenerator.paragraph({ sentences: 1 });
  const linkPost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: postTitle,
        post_type: "LINK" as const,
        community_id: community.id,
        link: {
          url: testUrl,
        } satisfies IRedditClonePostLink.ICreate,
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(linkPost);
  // 5. Create a snapshot of the LINK post
  const snapshot =
    await generate_random_reddit_clone_member_posts_snapshots_create(
      memberConnection,
      {
        body: {} satisfies IRedditClonePostSnapshot.ICreate,
        params: {
          postId: linkPost.id,
        },
      },
    );
  typia.assert(snapshot);
  // Validate snapshot properties for LINK type post
  TestValidator.equals("snapshot postType is LINK", snapshot.postType, "LINK");
  TestValidator.equals(
    "snapshot linkUrl matches original",
    snapshot.linkUrl,
    testUrl,
  );
  TestValidator.equals(
    "snapshot textContent is null",
    snapshot.textContent,
    null,
  );
  TestValidator.equals(
    "snapshot imageFileId is null",
    snapshot.imageFileId,
    null,
  );
  TestValidator.equals(
    "snapshot title matches original",
    snapshot.title,
    postTitle,
  );
  // Validate relation objects are populated
  TestValidator.predicate(
    "snapshot has post reference",
    snapshot.post !== null,
  );
  TestValidator.predicate(
    "snapshot has member reference",
    snapshot.member !== null,
  );
  TestValidator.predicate(
    "snapshot has community reference",
    snapshot.community !== null,
  );
  // Validate post reference details
  TestValidator.equals(
    "snapshot post id matches",
    snapshot.post.id,
    linkPost.id,
  );
  TestValidator.equals(
    "snapshot post title matches",
    snapshot.post.title,
    postTitle,
  );
  TestValidator.equals(
    "snapshot post type matches",
    snapshot.post.post_type,
    "LINK",
  );
  // Validate member reference details
  TestValidator.equals(
    "snapshot member id matches",
    snapshot.member.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "snapshot member username matches",
    snapshot.member.username,
    memberAuth.username,
  );
  // Validate community reference details
  TestValidator.equals(
    "snapshot community id matches",
    snapshot.community.id,
    community.id,
  );
  TestValidator.equals(
    "snapshot community name matches",
    snapshot.community.name,
    community.name,
  );
}
