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
import { generate_random_community_platform_member_posts_votes_create } from "../../../generate/generate_random_community_platform_member_posts_votes_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_post_votes_remove_downvote_success(
  connection: api.IConnection,
): Promise<void> {
  // Create voter member account
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_member_join(voterConnection, {});
  typia.assert(voter);
  // Create author member account
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {});
  typia.assert(author);
  // Create community (author creates community)
  const community =
    await generate_random_community_platform_member_communities_create(
      authorConnection,
      {},
    );
  typia.assert(community);
  // Both members subscribe to community
  const voterSubscription =
    await generate_random_community_platform_member_subscriptions_create(
      voterConnection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(voterSubscription);
  const authorSubscription =
    await generate_random_community_platform_member_subscriptions_create(
      authorConnection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(authorSubscription);
  // Author creates a post
  const post = await generate_random_community_platform_member_posts_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: community.name,
        content_type: "TEXT",
        content_text: {
          content: RandomGenerator.content({ paragraphs: 1 }),
          formatting: "plain",
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Voter casts a downvote
  const downvote =
    await generate_random_community_platform_member_posts_votes_create(
      voterConnection,
      {
        params: { postId: post.id },
        body: { type: "down" } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(downvote);
  // Verify downvote was created
  TestValidator.equals("downvote type", downvote.type, "down");
  // Remove the downvote
  await api.functional.communityPlatform.member.post_votes.mine.erase(
    voterConnection,
    { postId: post.id },
  );
  // Verify we cannot vote again without creating new vote (should create new vote with null type)
  // This tests that old vote is removed by trying to set vote type to null
  const afterRemovalVote =
    await generate_random_community_platform_member_posts_votes_create(
      voterConnection,
      {
        params: { postId: post.id },
        body: { type: null } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(afterRemovalVote);
  // Verify vote type is null after removal
  TestValidator.equals(
    "vote type null after removal",
    afterRemovalVote.type,
    null,
  );
  // Test business logic: creating a new downvote after removal should work
  const newDownvote =
    await generate_random_community_platform_member_posts_votes_create(
      voterConnection,
      {
        params: { postId: post.id },
        body: { type: "down" } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(newDownvote);
  TestValidator.equals(
    "can create new downvote after removal",
    newDownvote.type,
    "down",
  );
}
