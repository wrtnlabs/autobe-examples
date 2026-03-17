import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarma";
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

export async function test_api_karma_retrieval_after_vote_activity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create author member
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {});
  typia.assert(author);
  // 2. Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      authorConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe author to community
  const authorSubscription =
    await generate_random_community_platform_member_subscriptions_create(
      authorConnection,
      {
        body: {
          community_id: community.id,
          active: true,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(authorSubscription);
  // 4. Create text post
  const post = await generate_random_community_platform_member_posts_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
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
  // 5. Create voter member
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_member_join(voterConnection, {});
  typia.assert(voter);
  // 6. Subscribe voter to community
  const voterSubscription =
    await generate_random_community_platform_member_subscriptions_create(
      voterConnection,
      {
        body: {
          community_id: community.id,
          active: true,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(voterSubscription);
  // 7. Voter upvotes post (+1 karma)
  const upvote =
    await generate_random_community_platform_member_posts_votes_create(
      voterConnection,
      {
        params: { postId: post.id },
        body: {
          type: "up",
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(upvote);
  // 8. Retrieve author's karma and verify score = 1
  const karma = await api.functional.communityPlatform.member.karmas.at(
    authorConnection,
    {
      karmaId: author.id,
    },
  );
  typia.assert(karma);
  TestValidator.equals("karma ID matches author", karma.member.id, author.id);
  TestValidator.equals("karma score after upvote", karma.score, 1);
  TestValidator.predicate("karma record is active", karma.deleted_at === null);
  // 9. Voter changes vote to downvote (-2 karma adjustment: -1 for removing upvote, -1 for downvote)
  const downvote =
    await generate_random_community_platform_member_posts_votes_create(
      voterConnection,
      {
        params: { postId: post.id },
        body: {
          type: "down",
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(downvote);
  // 10. Retrieve karma again and verify score = -1
  const karmaAfterDownvote =
    await api.functional.communityPlatform.member.karmas.at(authorConnection, {
      karmaId: author.id,
    });
  typia.assert(karmaAfterDownvote);
  TestValidator.equals(
    "karma score after downvote",
    karmaAfterDownvote.score,
    -1,
  );
  // 11. Voter removes vote entirely (+1 karma adjustment)
  const removeVote =
    await generate_random_community_platform_member_posts_votes_create(
      voterConnection,
      {
        params: { postId: post.id },
        body: {
          type: null,
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(removeVote);
  // 12. Final karma retrieval and verification that score = 0
  const finalKarma = await api.functional.communityPlatform.member.karmas.at(
    authorConnection,
    {
      karmaId: author.id,
    },
  );
  typia.assert(finalKarma);
  TestValidator.equals(
    "final karma score after vote removal",
    finalKarma.score,
    0,
  );
  // Additional validations
  TestValidator.predicate(
    "updated_at should reflect changes",
    finalKarma.updated_at !== karma.created_at,
  );
  TestValidator.predicate(
    "created_at remains consistent",
    finalKarma.created_at === karma.created_at,
  );
}
