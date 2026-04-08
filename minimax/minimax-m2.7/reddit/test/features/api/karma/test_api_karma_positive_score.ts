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

export async function test_api_karma_positive_score(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first member (author who will receive upvotes)
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: `author_${RandomGenerator.alphabets(8)}`,
      href: "https://example.com/register",
      referrer: "https://google.com",
    },
  });
  typia.assert(author);
  // 2. Create community (author becomes owner)
  const community =
    await generate_random_reddit_clone_member_communities_create(
      authorConnection,
      {},
    );
  typia.assert(community);
  // 3. Create post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    authorConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text",
        body: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 4. Register second member (voter who will cast upvote)
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: `voter_${RandomGenerator.alphabets(8)}`,
      href: "https://example.com/register",
      referrer: "https://google.com",
    },
  });
  typia.assert(voter);
  // 5. Subscribe to community to allow voting
  await generate_random_reddit_clone_member_subscriptions_create(
    voterConnection,
    {
      body: {
        communityId: community.id,
      },
    },
  );
  // 6. Cast upvote on the post to increase author's karma
  await generate_random_reddit_clone_member_reddit_clone_posts_votes_create(
    voterConnection,
    {
      params: {
        postId: post.id,
      },
      body: {
        direction: "upvote",
      },
    },
  );
  // 7. Retrieve karma using GET /redditClone/users/{username}/karma
  const karma = await api.functional.redditClone.users.karma.at(connection, {
    username: author.username,
  });
  typia.assert(karma);
  // 8. Validate karma_score equals 1 (positive karma from upvote)
  TestValidator.equals("karma_score should be 1", karma.karmaScore, 1);
}
