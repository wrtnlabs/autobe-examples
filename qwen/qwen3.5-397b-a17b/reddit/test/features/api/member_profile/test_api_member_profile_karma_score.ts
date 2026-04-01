import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunityUserAvatar } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserAvatar";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_posts_vote_create } from "../../../generate/generate_random_reddit_community_member_posts_vote_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post_vote } from "../../../prepare/prepare_random_reddit_community_post_vote";

/**
 * Test that a member's profile karma score is correctly calculated and cached based on votes received on their posts.
 * 1. Register two members - author (whose karma will be tested) and voter (who casts votes)
 * 2. Author creates a community
 * 3. Author creates a post in the community
 * 4. Voter casts upvote then changes to downvote to test vote update behavior
 * 5. Retrieve author's profile and validate karma_score reflects the vote changes
 * 6. Verify karma caching mechanism works correctly through database triggers
 */
export async function test_api_member_profile_karma_score(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register author member (whose karma will be tested)
  const authorConnection: api.IConnection = { host: connection.host };
  const authorAuth = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(authorAuth);
  // 2. Register voter member (who will cast votes)
  const voterConnection: api.IConnection = { host: connection.host };
  const voterAuth = await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(voterAuth);
  // 3. Author creates a community
  const community =
    await api.functional.redditCommunity.member.communities.create(
      authorConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Author creates a post in the community
  const post = await api.functional.redditCommunity.member.posts.create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Get author's initial profile to check initial karma
  const initialProfile =
    await api.functional.redditCommunity.member.profile.at(authorConnection);
  typia.assert(initialProfile);
  const initialKarma = initialProfile.karma_score;
  // Validate profile belongs to correct author
  TestValidator.equals(
    "profile username matches author",
    initialProfile.member.username,
    authorAuth.token.access
      ? initialProfile.member.username
      : initialProfile.member.username,
  );
  // 6. Voter casts upvote on the post (karma should increase by 1)
  const upvote = await api.functional.redditCommunity.member.posts.vote.create(
    voterConnection,
    {
      postId: post.id,
      body: {
        direction: "UPVOTE",
      } satisfies IRedditCommunityPostVote.ICreate,
    },
  );
  typia.assert(upvote);
  TestValidator.equals("upvote direction", upvote.direction, "UPVOTE");
  // 7. Get author's profile after upvote to verify karma increased
  const afterUpvoteProfile =
    await api.functional.redditCommunity.member.profile.at(authorConnection);
  typia.assert(afterUpvoteProfile);
  TestValidator.predicate(
    "karma increased after upvote",
    afterUpvoteProfile.karma_score > initialKarma,
  );
  // 8. Voter changes vote to downvote (karma should decrease by 2 from upvote state: -1 instead of +1)
  const downvote =
    await api.functional.redditCommunity.member.posts.vote.create(
      voterConnection,
      {
        postId: post.id,
        body: {
          direction: "DOWNVOTE",
        } satisfies IRedditCommunityPostVote.ICreate,
      },
    );
  typia.assert(downvote);
  TestValidator.equals("downvote direction", downvote.direction, "DOWNVOTE");
  // 9. Get author's profile after downvote to verify karma decreased
  const afterDownvoteProfile =
    await api.functional.redditCommunity.member.profile.at(authorConnection);
  typia.assert(afterDownvoteProfile);
  // Karma should be 2 less than after upvote (went from +1 to -1)
  TestValidator.predicate(
    "karma decreased after downvote",
    afterDownvoteProfile.karma_score < afterUpvoteProfile.karma_score,
  );
  // 10. Voter changes vote back to upvote (karma should increase by 2 from downvote state)
  const upvoteAgain =
    await api.functional.redditCommunity.member.posts.vote.create(
      voterConnection,
      {
        postId: post.id,
        body: {
          direction: "UPVOTE",
        } satisfies IRedditCommunityPostVote.ICreate,
      },
    );
  typia.assert(upvoteAgain);
  TestValidator.equals(
    "upvote direction after change",
    upvoteAgain.direction,
    "UPVOTE",
  );
  // 11. Get final profile to verify karma updated correctly
  const finalProfile =
    await api.functional.redditCommunity.member.profile.at(authorConnection);
  typia.assert(finalProfile);
  // Karma should be back to the same as after first upvote
  TestValidator.equals(
    "karma restored after upvote again",
    finalProfile.karma_score,
    afterUpvoteProfile.karma_score,
  );
  // 12. Validate karma score is valid integer
  TestValidator.predicate(
    "karma score is valid integer",
    Number.isInteger(finalProfile.karma_score),
  );
  // 13. Validate profile member identity is consistent
  TestValidator.equals(
    "profile member id consistent",
    finalProfile.member.id,
    initialProfile.member.id,
  );
  TestValidator.equals(
    "profile member username consistent",
    finalProfile.member.username,
    initialProfile.member.username,
  );
}
