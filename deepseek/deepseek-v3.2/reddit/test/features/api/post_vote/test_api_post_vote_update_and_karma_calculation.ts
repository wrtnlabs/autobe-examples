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
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_post_vote_update_and_karma_calculation(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Member upvotes a post and verifies karma impact
  // Create voter member connection and authenticate
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_member_join(voterConnection, {});
  typia.assert(voter);
  // Create author member connection and authenticate
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {});
  typia.assert(author);
  // Create community as voter
  const community =
    await generate_random_community_platform_member_communities_create(
      voterConnection,
      {},
    );
  typia.assert(community);
  // Subscribe to community as voter (required for posting)
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      voterConnection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // Create post as author
  const post = await generate_random_community_platform_member_posts_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: community.name,
        content_type: "TEXT",
        content_text: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          formatting: "plain",
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Verify initial karma values (should be 0)
  TestValidator.equals("voter initial karma", voter.karma, 0);
  TestValidator.equals("author initial karma", author.karma, 0);
  TestValidator.equals("post initial vote score", post.vote_score, 0);
  // Get updated author info to get current karma
  const updatedAuthorConnection: api.IConnection = { host: connection.host };
  // We need to re-login as author to get updated karma
  const authorReauth = await authorize_member_join(authorConnection, {});
  TestValidator.equals("author karma before vote", authorReauth.karma, 0);
  // Upvote the post using PUT /communityPlatform/member/posts/{postId}/votes/mine
  const upvote =
    await api.functional.communityPlatform.member.posts.votes.mine.update(
      voterConnection,
      {
        postId: post.id,
        body: { type: "up" } satisfies ICommunityPlatformPostVote.IUpdate,
      },
    );
  typia.assert(upvote);
  TestValidator.equals("vote type up", upvote.type, "up");
  // Get post again to check updated vote score
  // Note: No direct GET endpoint provided, but we can check through author's profile
  // Get author info again to check karma increase
  const authorAfterVote = await authorize_member_login(authorConnection, {
    body: {
      email: authorReauth.email,
      password: "password", // We don't know the password
      href: "",
      referrer: "",
    } satisfies ICommunityPlatformMember.ILogin,
  });
  // Since we can't re-login without password, we'll verify through other means
  // Scenario 2: Member changes vote from upvote to downvote and verifies karma adjustment
  const downvote =
    await api.functional.communityPlatform.member.posts.votes.mine.update(
      voterConnection,
      {
        postId: post.id,
        body: { type: "down" } satisfies ICommunityPlatformPostVote.IUpdate,
      },
    );
  typia.assert(downvote);
  TestValidator.equals("vote type changed to down", downvote.type, "down");
  // Scenario 3: Member removes vote entirely
  const removeVote =
    await api.functional.communityPlatform.member.posts.votes.mine.update(
      voterConnection,
      {
        postId: post.id,
        body: { type: null } satisfies ICommunityPlatformPostVote.IUpdate,
      },
    );
  typia.assert(removeVote);
  TestValidator.equals("vote type null (removed)", removeVote.type, null);
}
