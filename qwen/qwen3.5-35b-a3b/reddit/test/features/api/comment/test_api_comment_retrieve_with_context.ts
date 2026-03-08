import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_comments_create } from "../../../generate/generate_random_reddit_platform_member_comments_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_subscribe } from "../../../generate/generate_random_reddit_platform_member_communities_subscribe";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_comment_retrieve_with_context(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create community
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await generate_random_reddit_platform_member_communities_subscribe(
      memberConnection,
      {
        body: { confirmSubscription: true },
        params: { communityId: community.id },
      },
    );
  typia.assert(subscription);
  // 4. Create post in community
  const post = await generate_random_reddit_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 6,
        }),
        postType: "TEXT",
        redditPlatformCommunityId: community.id,
        content: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 4,
          wordMax: 10,
        }),
      },
    },
  );
  typia.assert(post);
  // 5. Create comment on post
  const comment = await generate_random_reddit_platform_member_comments_create(
    memberConnection,
    {
      body: {
        post_id: post.id,
        parent_id: null,
        content: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 4,
          wordMax: 8,
        }),
      },
    },
  );
  typia.assert(comment);
  // 6. Retrieve comment
  const retrievedComment = await api.functional.redditPlatform.comments.at(
    memberConnection,
    {
      commentId: comment.id,
    },
  );
  typia.assert(retrievedComment);
  // 7. Validate comment data
  TestValidator.equals("comment id matches", retrievedComment.id, comment.id);
  TestValidator.equals(
    "comment content matches",
    retrievedComment.content,
    comment.content,
  );
  TestValidator.equals("vote score is 0", retrievedComment.vote_score, 0);
  TestValidator.equals(
    "author id matches",
    retrievedComment.author_id,
    memberAuth.id,
  );
  TestValidator.equals("post id matches", retrievedComment.post_id, post.id);
  TestValidator.equals("deleted_at is null", retrievedComment.deleted_at, null);
  TestValidator.equals(
    "post title matches",
    retrievedComment.post!.title,
    post.title,
  );
  TestValidator.equals(
    "author username matches",
    retrievedComment.author.username,
    memberAuth.username,
  );
  TestValidator.equals(
    "author displayName matches",
    retrievedComment.author.displayName,
    memberAuth.displayName,
  );
  TestValidator.equals(
    "author karmaScore is 0",
    retrievedComment.author.karmaScore,
    0,
  );
  TestValidator.equals(
    "post author username matches",
    retrievedComment.post!.author.username,
    memberAuth.username,
  );
  TestValidator.predicate(
    "comment createdAt is valid ISO 8601 format",
    () => !isNaN(new Date(retrievedComment.created_at).getTime()),
  );
  TestValidator.predicate(
    "comment updatedAt is valid ISO 8601 format",
    () => !isNaN(new Date(retrievedComment.updated_at).getTime()),
  );
  TestValidator.predicate(
    "post createdAt is valid ISO 8601 format",
    () => !isNaN(new Date(retrievedComment.post!.created_at).getTime()),
  );
  TestValidator.predicate(
    "post updatedAt is valid ISO 8601 format",
    () => !isNaN(new Date((retrievedComment.post as any).updated_at ?? "").getTime()),
  );
  TestValidator.predicate(
    "author createdAt is valid ISO 8601 format",
    () => !isNaN(new Date(retrievedComment.author.createdAt).getTime()),
  );
  TestValidator.predicate(
    "author updatedAt is valid ISO 8601 format",
    () => !isNaN(new Date((retrievedComment.author as any).updatedAt ?? "").getTime()),
  );
  typia.assert(retrievedComment);
}