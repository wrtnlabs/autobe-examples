import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
import type { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
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
import { generate_random_reddit_clone_member_reddit_clone_posts_votes_create } from "../../../generate/generate_random_reddit_clone_member_reddit_clone_posts_votes_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_vote } from "../../../prepare/prepare_random_reddit_clone_post_vote";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_post_vote_change_downvote_to_upvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as Author and create community/post
  const authorConnection: api.IConnection = { host: connection.host };
  const authorAuth = await authorize_member_join(authorConnection, {});
  typia.assert(authorAuth);
  // 2. Create community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      authorConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to community
  await generate_random_reddit_clone_member_subscriptions_create(
    authorConnection,
    {
      body: { communityId: community.id },
    },
  );
  // 4. Create text post
  const post = await generate_random_reddit_clone_member_posts_create(
    authorConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        type: "text",
        body: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  TestValidator.equals("initial vote score is 0", post.voteScore, 0);
  // 5. Authenticate as Voter
  const voterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(voterConnection, {});
  // 6. Subscribe to enable voting
  await generate_random_reddit_clone_member_subscriptions_create(
    voterConnection,
    {
      body: { communityId: community.id },
    },
  );
  // 7. Cast initial downvote
  const initialVote =
    await generate_random_reddit_clone_member_reddit_clone_posts_votes_create(
      voterConnection,
      {
        body: { direction: "downvote" },
        params: { postId: post.id },
      },
    );
  typia.assert(initialVote);
  TestValidator.equals(
    "initial vote direction is downvote",
    initialVote.direction,
    "downvote",
  );
  const voteCreatedAt = new Date(initialVote.created_at).getTime();
  // 8. Update vote from downvote to upvote
  const updatedVote =
    await api.functional.redditClone.member.redditClone.posts.votes.update(
      voterConnection,
      {
        postId: post.id,
        voteId: initialVote.id,
        body: {
          id: initialVote.id,
          direction: "upvote",
          created_at: initialVote.created_at,
          updated_at: initialVote.updated_at,
          member: initialVote.member,
          post: initialVote.post,
        } satisfies IRedditClonePostVote,
      },
    );
  typia.assert(updatedVote);
  // Validation 1: Vote direction is now upvote
  TestValidator.equals(
    "updated vote direction is upvote",
    updatedVote.direction,
    "upvote",
  );
  // Validation 2: Vote's updated_at is newer than created_at
  const voteUpdatedAt = new Date(updatedVote.updated_at).getTime();
  TestValidator.predicate(
    "updated_at is newer than created_at",
    voteUpdatedAt > voteCreatedAt,
  );
  // Validation 3: Vote ID remains unchanged
  TestValidator.equals("vote id unchanged", updatedVote.id, initialVote.id);
}
