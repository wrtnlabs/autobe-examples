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

export async function test_api_post_vote_update_by_different_user_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as Post Author (Member B who will create the post)
  const authorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1).replace(/\s/g, "_").toLowerCase(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    },
  });
  // 2. Author creates a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      authorConnection,
      {},
    );
  typia.assert(community);
  // 3. Authenticate as Member A who will cast the vote
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1).replace(/\s/g, "_").toLowerCase(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    },
  });
  // 4. Member A subscribes to the community
  await generate_random_reddit_clone_member_subscriptions_create(
    memberAConnection,
    {
      body: { communityId: community.id },
    },
  );
  // 5. Post author creates a text post
  const post = await generate_random_reddit_clone_member_posts_create(
    authorConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text",
        body: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  // 6. Authenticate as Member C who will attempt to update another user's vote
  const memberCConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberCConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1).replace(/\s/g, "_").toLowerCase(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    },
  });
  // 7. Member C subscribes to the community
  await generate_random_reddit_clone_member_subscriptions_create(
    memberCConnection,
    {
      body: { communityId: community.id },
    },
  );
  // 8. Member A casts an upvote on the post
  const memberAVote =
    await generate_random_reddit_clone_member_reddit_clone_posts_votes_create(
      memberAConnection,
      {
        params: { postId: post.id },
        body: { direction: "upvote" },
      },
    );
  typia.assert(memberAVote);
  // 9. Member C (different user) tries to update Member A's vote - should fail with 403
  await TestValidator.httpError(
    "Member C cannot update Member A's vote",
    403,
    async () =>
      await api.functional.redditClone.member.redditClone.posts.votes.update(
        memberCConnection,
        {
          postId: post.id,
          voteId: memberAVote.id,
          body: { direction: "downvote" } as IRedditClonePostVote,
        },
      ),
  );
}