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

export async function test_api_post_update_success_scenario(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(10),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditPlatformMember.IJoin;
  const member = await authorize_member_join(memberConnection, {
    body: joinInput,
  });
  typia.assert(member);
  // 2. Create community
  const communityName = `test_${RandomGenerator.alphaNumeric(8)}`;
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: communityName,
          description: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe member to community
  const subscription =
    await generate_random_reddit_platform_member_subscriptions_subscribe(
      memberConnection,
      {
        body: {
          reddit_platform_community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. Create post (get existing post from community feed since no create endpoint available)
  const postList = await api.functional.redditPlatform.posts.index(
    memberConnection,
    {
      body: {
        communityId: community.id,
        limit: 10,
      },
    },
  );
  typia.assert(postList);
  let post = postList.data.find((p) => p.author.id === member.user.id) || null;
  if (!post) {
    post = typia.random<IRedditPlatformPost.ISummary>();
  }
  typia.assert(post);
  const originalCreatedAt = post.created_at;
  const originalPostType = post.post_type;
  const originalVoteScore = post.vote_score;
  const originalCommentCount = post.comment_count;
  // 5. Update post
  const updateConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(updateConnection, {
    body: {
      email: joinInput.email,
      password: joinInput.password,
    },
  });
  const newTitle = `Updated: ${RandomGenerator.paragraph({ sentences: 1 })}`;
  const newContent = RandomGenerator.paragraph({ sentences: 3 });
  const updateBody = {
    title: newTitle,
    content: newContent,
  } satisfies IRedditPlatformPost.IUpdate;
  const updatedPost = await api.functional.redditPlatform.member.posts.update(
    updateConnection,
    {
      postId: post.id,
      body: updateBody,
    },
  );
  typia.assert(updatedPost);
  // 6. Validate update
  TestValidator.equals("post title updated", updatedPost.title, newTitle);
  TestValidator.equals("post content updated", updatedPost.content, newContent);
  TestValidator.equals(
    "post type unchanged",
    updatedPost.post_type,
    originalPostType,
  );
  TestValidator.equals(
    "vote score unchanged",
    updatedPost.vote_score,
    originalVoteScore,
  );
  TestValidator.equals(
    "comment count unchanged",
    updatedPost.comment_count,
    originalCommentCount,
  );
  TestValidator.predicate(
    "created_at preserved",
    updatedPost.created_at === originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at changed",
    new Date(updatedPost.updated_at) > new Date(originalCreatedAt),
  );
}