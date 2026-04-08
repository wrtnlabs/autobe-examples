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
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
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

export async function test_api_karma_negative_score(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member1 (author) who will receive downvotes
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {});
  // 2. Create community by member1
  const community =
    await generate_random_reddit_clone_member_communities_create(
      member1Connection,
      {},
    );
  // 3. Create post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    member1Connection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        type: "text",
        body: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  // 4. Create member2 (voter) who will cast the downvote
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {});
  // 5. member2 subscribes to the community to allow voting
  await generate_random_reddit_clone_member_subscriptions_create(
    member2Connection,
    {
      body: {
        communityId: community.id,
      },
    },
  );
  // 6. Cast downvote on the post to decrease author's karma
  await generate_random_reddit_clone_member_reddit_clone_posts_votes_create(
    member2Connection,
    {
      body: {
        direction: "downvote",
      },
      params: {
        postId: post.id,
      },
    },
  );
  // 7. Retrieve member1's karma score
  const karma = await api.functional.redditClone.users.karma.at(connection, {
    username: member1.username,
  });
  typia.assert(karma);
  // 8. Assert karma score equals -1 (downvote decreases karma by 1)
  TestValidator.equals("karma score is negative", karma.karmaScore, -1);
}
