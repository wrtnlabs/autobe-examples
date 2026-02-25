import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_communities_moderators_create } from "../../../generate/generate_random_community_platform_user_communities_moderators_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { generate_random_community_platform_user_posts_votes_create } from "../../../generate/generate_random_community_platform_user_posts_votes_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";

/**
 * Test moderator's ability to investigate specific votes on posts for transparency and content moderation purposes.
 *
 * This test validates that moderators can retrieve detailed vote information including:
 * - Vote type (upvote/downvote)
 * - Voter identity and profile information
 * - Vote timestamps (creation and update)
 * - Post context and community relationship
 * - Proper authorization checks for moderator access
 */
export async function test_api_post_vote_review_moderator_investigation(
  connection: api.IConnection,
): Promise<void> {
  // Store passwords for later login
  const moderatorPassword = RandomGenerator.alphaNumeric(16);
  const userPassword = RandomGenerator.alphaNumeric(16);
  // 1. Create and authenticate moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: moderatorPassword,
      username: RandomGenerator.alphabets(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderatorAuth);
  // 2. Create and authenticate regular user account
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: userPassword,
      username: RandomGenerator.alphabets(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userAuth);
  // 3. Create a community with moderator as owner
  const community =
    await generate_random_community_platform_user_communities_create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 5,
          }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Assign moderator role to the moderator account
  const moderatorAssignment =
    await generate_random_community_platform_user_communities_moderators_create(
      moderatorConnection,
      {
        params: { communityId: community.id },
        body: {
          user_id: moderatorAuth.id,
          role_level: "moderator",
          notes: "Primary community moderator",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);
  // 5. Create a post within the moderated community
  const post = await generate_random_community_platform_user_posts_create(
    moderatorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 10,
        }),
        community_name: community.name,
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 6. Regular user casts vote on the post
  const vote = await generate_random_community_platform_user_posts_votes_create(
    userConnection,
    {
      params: { postId: post.id },
      body: {
        vote_type: RandomGenerator.pick(["upvote", "downvote"] as const),
      } satisfies ICommunityPlatformPostVote.ICreate,
    },
  );
  typia.assert(vote);
  // 7. Authenticate as moderator using stored password
  const moderatorLoginConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_login(moderatorLoginConnection, {
    body: {
      email: moderatorAuth.email,
      password: moderatorPassword,
    } satisfies ICommunityPlatformModerator.ILogin,
  });
  // 8. Retrieve vote details using moderator endpoint
  const retrievedVote =
    await api.functional.communityPlatform.moderator.posts.votes.at(
      moderatorLoginConnection,
      {
        postId: post.id,
        voteId: vote.id,
      },
    );
  typia.assert(retrievedVote);
  // 9. Validate vote information matches
  TestValidator.equals("vote ID matches", retrievedVote.id, vote.id);
  TestValidator.equals(
    "vote type matches",
    retrievedVote.vote_type,
    vote.vote_type,
  );
  TestValidator.equals("voter ID matches", retrievedVote.user.id, userAuth.id);
  TestValidator.equals("post ID matches", retrievedVote.post.id, post.id);
  TestValidator.predicate(
    "has creation timestamp",
    retrievedVote.created_at !== undefined,
  );
  TestValidator.predicate(
    "has update timestamp",
    retrievedVote.updated_at !== undefined,
  );
  // 10. Validate voter information
  TestValidator.equals(
    "voter username matches",
    retrievedVote.user.username,
    userAuth.username,
  );
  TestValidator.equals(
    "voter display name matches",
    retrievedVote.user.display_name,
    userAuth.display_name,
  );
  TestValidator.equals(
    "voter avatar URL matches",
    retrievedVote.user.avatar_url,
    userAuth.avatar_url,
  );
  // 11. Validate post information
  TestValidator.equals(
    "post title matches",
    retrievedVote.post.title,
    post.title,
  );
  TestValidator.equals(
    "post type matches",
    retrievedVote.post.post_type,
    post.post_type,
  );
  TestValidator.equals(
    "post community matches",
    retrievedVote.post.community.id,
    community.id,
  );
  TestValidator.equals(
    "post author matches",
    retrievedVote.post.author.id,
    moderatorAuth.id,
  );
}
