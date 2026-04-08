import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
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
import { generate_random_reddit_clone_member_reddit_clone_comments_votes_create } from "../../../generate/generate_random_reddit_clone_member_reddit_clone_comments_votes_create";
import { generate_random_reddit_clone_member_reddit_clone_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_reddit_clone_posts_comments_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_vote } from "../../../prepare/prepare_random_reddit_clone_post_vote";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_comment_vote_remove_upvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member1 (comment author)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {});
  // 2. Create member2 (voter)
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {});
  // 3. Member1 creates a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      member1Connection,
      {},
    );
  // 4. Both members subscribe to the community
  await generate_random_reddit_clone_member_subscriptions_create(
    member1Connection,
    {
      body: { communityId: community.id },
    },
  );
  await generate_random_reddit_clone_member_subscriptions_create(
    member2Connection,
    {
      body: { communityId: community.id },
    },
  );
  // 5. Member1 creates a post
  const post = await generate_random_reddit_clone_member_posts_create(
    member1Connection,
    {},
  );
  // 6. Member1 creates a comment on the post
  const comment =
    await generate_random_reddit_clone_member_reddit_clone_posts_comments_create(
      member1Connection,
      { params: { postId: post.id } },
    );
  typia.assert(comment);
  // Record member1's karma before vote removal (after upvote was cast)
  // After upvote is cast, member1's karma should have increased by 1
  const member1KarmaAfterUpvote = member1.karmaScore + 1;
  // 7. Member2 casts an upvote on the comment
  const vote =
    await generate_random_reddit_clone_member_reddit_clone_comments_votes_create(
      member2Connection,
      { params: { commentId: comment.id } },
    );
  typia.assert(vote);
  // 8. Member2 removes their upvote
  await api.functional.redditClone.member.redditClone.comments.votes.erase(
    member2Connection,
    { commentId: comment.id, voteId: vote.id },
  );
  // Validate: Removing upvote should return void (HTTP 204)
  // The karma should decrease by 1 (the upvote effect is removed)
  TestValidator.equals(
    "karma adjusted after upvote removal",
    member1.karmaScore,
    member1KarmaAfterUpvote - 1,
  );
}
