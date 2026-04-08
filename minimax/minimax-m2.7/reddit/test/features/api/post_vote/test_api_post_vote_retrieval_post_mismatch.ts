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

export async function test_api_post_vote_retrieval_post_mismatch(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Create first community and subscribe
  const firstCommunity =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  await generate_random_reddit_clone_member_subscriptions_create(
    memberConnection,
    {
      body: {
        communityId: firstCommunity.id,
      } satisfies IRedditCloneSubscription.ICreate,
    },
  );
  // Create first post
  const firstPost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: firstCommunity.id,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        type: "text" as const,
        body: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  // Cast vote on first post
  const firstVote =
    await generate_random_reddit_clone_member_reddit_clone_posts_votes_create(
      memberConnection,
      {
        params: { postId: firstPost.id },
        body: { direction: "upvote" as const },
      },
    );
  // Create second community and subscribe
  const secondCommunity =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  await generate_random_reddit_clone_member_subscriptions_create(
    memberConnection,
    {
      body: {
        communityId: secondCommunity.id,
      } satisfies IRedditCloneSubscription.ICreate,
    },
  );
  // Create second post
  const secondPost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: secondCommunity.id,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        type: "text" as const,
        body: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  // Attempt to retrieve first vote using second post's ID (should fail with 404)
  await TestValidator.error(
    "vote retrieval with post mismatch should return 404",
    async () => {
      await api.functional.redditClone.redditClone.posts.votes.at(
        memberConnection,
        {
          postId: secondPost.id,
          voteId: firstVote.id,
        },
      );
    },
  );
}
