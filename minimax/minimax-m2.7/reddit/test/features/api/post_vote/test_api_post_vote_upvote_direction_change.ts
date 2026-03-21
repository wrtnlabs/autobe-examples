import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text_content } from "../../../prepare/prepare_random_reddit_clone_post_text_content";

export async function test_api_post_vote_upvote_direction_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member1 creates community
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {});
  const community =
    await generate_random_reddit_clone_member_communities_create(
      member1Connection,
      {},
    );
  typia.assert(community);
  // 2. Member2 joins, subscribes, and creates a text post
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {});
  await generate_random_reddit_clone_member_subscriptions_create(
    member2Connection,
    {
      body: { community_id: community.id },
    },
  );
  const post = await generate_random_reddit_clone_member_posts_create(
    member2Connection,
    {
      body: {
        communityName: community.name,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text",
      },
    },
  );
  typia.assert(post);
  // 3. Member1 subscribes to community
  await generate_random_reddit_clone_member_subscriptions_create(
    member1Connection,
    {
      body: { community_id: community.id },
    },
  );
  // 4. Member1 downvotes the post first
  const downvoteVote =
    await api.functional.redditClone.member.posts.votes.create(
      member1Connection,
      {
        postId: post.id,
      },
    );
  typia.assert(downvoteVote);
  TestValidator.equals(
    "initial vote should be upvote (API creates upvote by default)",
    downvoteVote.direction,
    "upvote",
  );
  // 5. Member1 updates vote from upvote to downvote
  const changedToDownvote =
    await api.functional.redditClone.member.posts.votes.update(
      member1Connection,
      {
        postId: post.id,
        voteId: downvoteVote.id,
        body: { direction: "downvote" } satisfies IRedditClonePostImage.IUpdate,
      },
    );
  typia.assert(changedToDownvote);
  TestValidator.equals(
    "vote direction changed to downvote",
    changedToDownvote.direction,
    "downvote",
  );
  // 6. Member1 changes vote from downvote to upvote (this is the direction change being tested)
  const finalVote = await api.functional.redditClone.member.posts.votes.update(
    member1Connection,
    {
      postId: post.id,
      voteId: changedToDownvote.id,
      body: { direction: "upvote" } satisfies IRedditClonePostImage.IUpdate,
    },
  );
  typia.assert(finalVote);
  // Validate vote direction changed to upvote
  TestValidator.equals(
    "vote direction changed to upvote",
    finalVote.direction,
    "upvote",
  );
  TestValidator.equals(
    "vote ID remains the same (updated not duplicated)",
    finalVote.id,
    downvoteVote.id,
  );
}
