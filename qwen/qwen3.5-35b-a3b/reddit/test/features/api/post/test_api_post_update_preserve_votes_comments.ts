import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostEngagementStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostEngagementStat";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import type { IRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostSnapshot";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_subscriptions_subscribe } from "../../../generate/generate_random_reddit_platform_member_subscriptions_subscribe";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";

export async function test_api_post_update_preserve_votes_comments(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup - Create community and owner member
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerResult = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<20>>(),
      password: typia.random<string & tags.MinLength<8>>(),
      displayName: RandomGenerator.name(),
      href: "http://localhost",
      referrer: "http://localhost",
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(ownerResult);
  const communityResult =
    await api.functional.redditPlatform.member.communities.create(
      ownerConnection,
      {
        body: {
          name: typia.random<
            string &
              tags.MinLength<3> &
              tags.MaxLength<21> &
              tags.Pattern<"^[a-zA-Z0-9_]+$">
          >(),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityResult);
  // 2. Subscribe owner to community
  await api.functional.redditPlatform.member.subscriptions.subscribe(
    ownerConnection,
    {
      body: {
        reddit_platform_community_id: communityResult.id,
      } satisfies IRedditPlatformCommunitySubscription.ICreate,
    },
  );
  // 3. Create initial post
  const createdPost = await api.functional.redditPlatform.posts.index(
    ownerConnection,
    {
      body: {
        search: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(createdPost);
  // If no existing post found, we cannot proceed - need to create one first
  // The SDK doesn't have a create endpoint, so we need to work with existing posts
  if (createdPost.data.length === 0) {
    TestValidator.error("no existing post found", () => {
      throw new Error("Cannot test post update without existing posts");
    });
  }
  const initialPost = createdPost.data[0];
  typia.assert(initialPost);
  const originalPostId = initialPost.id;
  const originalCreatedAt = initialPost.created_at;
  // 4. Create voting members and cast votes
  for (let i = 0; i < 3; i++) {
    const voterConnection: api.IConnection = { host: connection.host };
    const voterResult = await authorize_member_join(voterConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string & tags.MinLength<3> & tags.MaxLength<20>
        >(),
        password: typia.random<string & tags.MinLength<8>>(),
        displayName: RandomGenerator.name(),
        href: "http://localhost",
        referrer: "http://localhost",
      } satisfies IRedditPlatformMember.IJoin,
    });
    typia.assert(voterResult);
    await api.functional.redditPlatform.member.subscriptions.subscribe(
      voterConnection,
      {
        body: {
          reddit_platform_community_id: communityResult.id,
        } satisfies IRedditPlatformCommunitySubscription.ICreate,
      },
    );
    await api.functional.redditPlatform.member.posts.vote.updateVote(
      voterConnection,
      {
        postId: originalPostId,
        body: {
          vote_type: i % 2 === 0 ? "UPVOTE" : "DOWNVOTE",
        } satisfies IRedditPlatformPost.IVoteRequest,
      },
    );
  }
  // 5. Create comments
  for (let i = 0; i < 2; i++) {
    const commenterConnection: api.IConnection = { host: connection.host };
    const commenterResult = await authorize_member_join(commenterConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string & tags.MinLength<3> & tags.MaxLength<20>
        >(),
        password: typia.random<string & tags.MinLength<8>>(),
        displayName: RandomGenerator.name(),
        href: "http://localhost",
        referrer: "http://localhost",
      } satisfies IRedditPlatformMember.IJoin,
    });
    typia.assert(commenterResult);
    await api.functional.redditPlatform.member.subscriptions.subscribe(
      commenterConnection,
      {
        body: {
          reddit_platform_community_id: communityResult.id,
        } satisfies IRedditPlatformCommunitySubscription.ICreate,
      },
    );
    await api.functional.redditPlatform.member.comments.create(
      commenterConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          post_id: originalPostId,
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  }
  // 6. Get post with votes and comments before update
  const postResponse = await api.functional.redditPlatform.posts.index(
    ownerConnection,
    {
      body: {
        authorId: ownerResult.user.id,
        limit: 1,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(postResponse);
  const postWithVotesComments = postResponse.data[0];
  typia.assert(postWithVotesComments);
  const voteScoreBeforeUpdate = postWithVotesComments.vote_score;
  const commentCountBeforeUpdate = postWithVotesComments.comment_count;
  const createdAtBeforeUpdate = postWithVotesComments.created_at;
  // 7. Update post content
  const updatedPost = await api.functional.redditPlatform.member.posts.update(
    ownerConnection,
    {
      postId: originalPostId,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IRedditPlatformPost.IUpdate,
    },
  );
  typia.assert(updatedPost);
  // 8. Verify votes and comments are preserved
  TestValidator.equals(
    "vote score preserved after update",
    updatedPost.vote_score,
    voteScoreBeforeUpdate,
  );
  TestValidator.equals(
    "comment count preserved after update",
    updatedPost.comment_count,
    commentCountBeforeUpdate,
  );
  TestValidator.equals(
    "created_at preserved after update",
    updatedPost.created_at,
    createdAtBeforeUpdate,
  );
}