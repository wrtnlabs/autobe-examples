import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
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
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_posts_votes_create } from "../../../generate/generate_random_community_platform_member_posts_votes_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

/**
 * Test profile retrieval after performing platform activities that should update profile data: create a community, create a post with upvotes, write a comment, and then retrieve profile. Verify that the profile reflects updated karma score (should increase from upvotes), posts array includes the created post summary, comments array includes the written comment summary, and that the member's nickname and avatar remain unchanged if not updated. This tests that the profile dynamically reflects member activities and contributions across the platform. Validate that posts and comments arrays include proper summaries with essential fields like title, content preview, vote scores, and timestamps.
 */
export async function test_api_member_profile_reflects_activities_and_karma(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create primary member (Member A)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberA);
  // 2. Create secondary member (Member B) for upvoting
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberB);
  // 3. Member A creates a community using utility function
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Member A subscribes to the community (required for posting) using utility function
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberAConnection,
      {
        body: {
          community_id: community.id,
          active: true,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 5. Member A creates a post in the community using utility function
  const post = await generate_random_community_platform_member_posts_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        content_type: "TEXT" as const,
        content_text: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          formatting: "plain",
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 6. Member B upvotes Member A's post (increases Member A's karma) using utility function
  const vote =
    await generate_random_community_platform_member_posts_votes_create(
      memberBConnection,
      {
        body: {
          type: "up" as const,
        } satisfies ICommunityPlatformPostVote.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(vote);
  // 7. Member A writes a comment on their own post using utility function
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      memberAConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformComment.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // 8. Retrieve Member A's profile
  const profile =
    await api.functional.communityPlatform.member.profile.at(memberAConnection);
  typia.assert(profile);
  // 9. Validate profile reflects activities
  // Karma should be 1 (from the upvote)
  TestValidator.equals("karma should be 1", profile.karma, 1);
  // Posts array should contain 1 post summary
  TestValidator.equals("posts array length", profile.posts.length, 1);
  const postSummary = profile.posts[0];
  TestValidator.equals("post summary id matches", postSummary.id, post.id);
  TestValidator.equals(
    "post summary title matches",
    postSummary.title,
    post.title,
  );
  TestValidator.equals(
    "post summary author id matches",
    postSummary.author.id,
    memberA.id,
  );
  TestValidator.equals(
    "post summary community id matches",
    postSummary.community.id,
    community.id,
  );
  TestValidator.predicate(
    "post summary has vote score",
    typeof postSummary.vote_score === "number",
  );
  TestValidator.predicate(
    "post summary has comment count",
    typeof postSummary.comment_count === "number",
  );
  TestValidator.predicate(
    "post summary has created_at",
    typeof postSummary.created_at === "string",
  );
  TestValidator.predicate(
    "post summary has content_preview",
    typeof postSummary.content_preview === "string",
  );
  // Comments array should contain 1 comment summary
  TestValidator.equals("comments array length", profile.comments.length, 1);
  const commentSummary = profile.comments[0];
  TestValidator.equals(
    "comment summary id matches",
    commentSummary.id,
    comment.id,
  );
  TestValidator.equals(
    "comment summary content matches",
    commentSummary.content,
    comment.content,
  );
  TestValidator.equals(
    "comment summary author id matches",
    commentSummary.author.id,
    memberA.id,
  );
  TestValidator.equals(
    "comment summary post id matches",
    commentSummary.post.id,
    post.id,
  );
  TestValidator.predicate(
    "comment summary has voteScore",
    typeof commentSummary.voteScore === "number",
  );
  TestValidator.predicate(
    "comment summary has createdAt",
    typeof commentSummary.createdAt === "string",
  );
  TestValidator.predicate(
    "comment summary has updatedAt",
    typeof commentSummary.updatedAt === "string",
  );
  TestValidator.predicate(
    "comment summary parent is null or undefined",
    commentSummary.parent === null || commentSummary.parent === undefined,
  );
  // Profile identity fields should remain unchanged
  TestValidator.equals(
    "username unchanged",
    profile.username,
    memberA.username,
  );
  TestValidator.equals(
    "nickname unchanged",
    profile.nickname,
    memberA.nickname,
  );
  TestValidator.equals("avatar remains null", profile.avatar, null);
  TestValidator.equals("email unchanged", profile.email, memberA.email);
  TestValidator.equals(
    "email_verified unchanged",
    profile.email_verified,
    memberA.email_verified,
  );
}
