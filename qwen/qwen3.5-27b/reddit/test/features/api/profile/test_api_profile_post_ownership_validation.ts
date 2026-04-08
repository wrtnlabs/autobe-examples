import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunitySubscription";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community_subscription } from "../../../prepare/prepare_random_reddit_clone_community_subscription";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test that the profile post endpoint validates post ownership and returns 404 when the post does not belong to the specified profile.
 *
 * Validates the complete post ownership verification flow including creation of two separate member accounts, community setup, subscriptions, and post creation. Ensures that the profile post endpoint correctly enforces ownership validation by returning 404 errors when the profile ID does not match the post's actual author, while successfully retrieving posts when ownership is correctly specified.
 *
 * Special attention is given to verifying that the endpoint properly handles error cases for mismatched ownership, non-existent posts, and validates that only the correct owner's profile ID can retrieve the post successfully.
 *
 * 1. Create two separate member user accounts (member1 and member2)
 * 2. Create a community and subscribe both members
 * 3. Create a post by member1 in the community
 * 4. Attempt to retrieve member1's post using member2's profileId - expect 404
 * 5. Verify the same post can be successfully retrieved using member1's correct profileId
 * 6. Test with a non-existent postId to verify 404 is returned
 * 7. Test with mismatched profileId and postId combination
 */
export async function test_api_profile_post_ownership_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create two separate member user accounts
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      username: RandomGenerator.name(1),
    },
  });
  typia.assert(member1);
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      username: RandomGenerator.name(1),
    },
  });
  typia.assert(member2);
  // 2. Get an existing community (using SDK directly as no utility exists for creation)
  const publicConnection: api.IConnection = { host: connection.host };
  const communityPage = await api.functional.redditClone.communities.index(
    publicConnection,
    {
      body: {} satisfies IRedditCloneCommunity.IRequest,
    },
  );
  typia.assert(communityPage);
  // Use the first community from the list if available
  if (communityPage.data.length === 0) {
    throw new Error(
      "No communities available for testing. Please create a community first.",
    );
  }
  const community = communityPage.data[0];
  typia.assert(community);
  // 3. Subscribe both members to the community
  await generate_random_reddit_clone_member_subscriptions_create(
    member1Connection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  await generate_random_reddit_clone_member_subscriptions_create(
    member2Connection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  // 4. Create a post by member1 in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    member1Connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        text_content: RandomGenerator.content({ paragraphs: 1 }),
      },
    },
  );
  typia.assert(post);
  // Get member1's profile ID from the post's author
  const member1ProfileId = post.author.id;
  // Create a post with member2 to get their profile ID
  const member2Post = await generate_random_reddit_clone_member_posts_create(
    member2Connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        text_content: RandomGenerator.content({ paragraphs: 1 }),
      },
    },
  );
  typia.assert(member2Post);
  const member2ProfileId = member2Post.author.id;
  // 5. Attempt to retrieve member1's post using member2's profileId - expect 404
  await TestValidator.error(
    "404 when profileId doesn't match post owner",
    async () => {
      await api.functional.redditClone.profiles.posts.at(publicConnection, {
        profileId: member2ProfileId,
        postId: post.id,
      });
    },
  );
  // 6. Verify the same post can be successfully retrieved using member1's correct profileId
  const retrievedPost = await api.functional.redditClone.profiles.posts.at(
    publicConnection,
    {
      profileId: member1ProfileId,
      postId: post.id,
    },
  );
  typia.assert(retrievedPost);
  TestValidator.equals(
    "post retrieved with correct profileId",
    retrievedPost.id,
    post.id,
  );
  // 7. Test with a non-existent postId to verify 404 is returned
  const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("404 when postId doesn't exist", async () => {
    await api.functional.redditClone.profiles.posts.at(publicConnection, {
      profileId: member1ProfileId,
      postId: nonExistentPostId,
    });
  });
  // 8. Test with mismatched profileId and postId combination (member2's profile, member2's post)
  const retrievedMember2Post =
    await api.functional.redditClone.profiles.posts.at(publicConnection, {
      profileId: member2ProfileId,
      postId: member2Post.id,
    });
  typia.assert(retrievedMember2Post);
  TestValidator.equals(
    "member2's post retrieved with member2's profileId",
    retrievedMember2Post.id,
    member2Post.id,
  );
}
