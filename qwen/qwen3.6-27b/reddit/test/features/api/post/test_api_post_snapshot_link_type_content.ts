import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import type { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
import type { IRedditLikeCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";

/**
 * Test snapshot retrieval for a link-type post to verify URL content is properly preserved.
 *
 * Validates the complete workflow of authenticating as a member, creating a community,
 * subscribing to it, creating a link-type post with a title and external URL, and
 * retrieving the automatically created snapshot. The link post type stores the URL in
 * the url field while body remains null. The test verifies that the snapshot correctly
 * captures the post_type as 'link', the url field contains the external URL, body is
 * null, and the snapshot includes author, community, and creation timestamp.
 *
 * 1. Register a new member account with email, password, and username.
 * 2. Create a community with name, description, and optional icon URI.
 * 3. Subscribe the member to the community using the community ID.
 * 4. Create a link-type post with title, post_type 'link', community_id, and url, with body null.
 * 5. Retrieve the snapshot using post ID as snapshot ID since it's automatically created.
 * 6. Validate snapshot structure matches link-type post expectations.
 * 7. Confirm post_type is 'link', url is present, body is null.
 * 8. Verify author and community information are correctly captured.
 * 9. Ensure created_at timestamp exists on the snapshot.
 */
export async function test_api_post_snapshot_link_type_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
    },
  });
  typia.assert(member);
  // 2. Create community as authenticated member
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberConnection,
      {
        body: { community_id: community.id },
      },
    );
  typia.assert(subscription);
  // 4. Create a link-type post with explicit body null, post_type 'link', and URL
  const post = await generate_random_reddit_like_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "link",
        community_id: community.id,
        url: typia.random<string & tags.Format<"uri">>(),
        body: null,
      },
    },
  );
  typia.assert(post);
  // 5. Retrieve the automatically created snapshot
  const snapshot = await api.functional.redditLikeCommunity.posts.snapshots.at(
    memberConnection,
    {
      postId: post.id,
      snapshotId: post.id,
    },
  );
  typia.assert(snapshot);
  // 6. Validate snapshot post_type is 'link'
  TestValidator.equals(
    "snapshot post_type is link",
    snapshot.post_type,
    "link",
  );
  // 7. Validate snapshot url is present and matches post url
  TestValidator.predicate("snapshot url is present", snapshot.url !== null);
  TestValidator.equals(
    "snapshot url matches input url",
    snapshot.url,
    post.url!,
  );
  // 8. Validate snapshot body is null for link post
  TestValidator.equals(
    "snapshot body is null for link post",
    snapshot.body,
    null,
  );
  // 9. Validate snapshot title matches post title
  TestValidator.equals(
    "snapshot title matches post title",
    snapshot.title,
    post.title,
  );
  // 10. Validate snapshot author exists (never null in snapshot DTO)
  TestValidator.predicate("snapshot author exists", snapshot.author.id !== "");
  // 11. Validate snapshot community exists (never null in snapshot DTO)
  TestValidator.predicate(
    "snapshot community exists",
    snapshot.community.id !== "",
  );
  // 12. Validate snapshot created_at exists (never null in snapshot DTO)
  TestValidator.predicate(
    "snapshot created_at exists",
    snapshot.created_at !== "",
  );
}
