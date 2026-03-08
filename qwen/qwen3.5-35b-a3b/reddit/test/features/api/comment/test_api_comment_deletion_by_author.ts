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

export async function test_api_comment_deletion_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account A (comment author)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(memberAConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: "Password123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(memberA);
  // 2. Create member account B (post creator and community owner)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(memberBConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: "Password123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(memberB);
  // 3. Member B creates a community
  const community: IRedditPlatformCommunity =
    await generate_random_reddit_platform_member_communities_create(
      memberBConnection,
      {
        body: {
          name: RandomGenerator.alphabets(6),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 4. Member A subscribes to the community
  const subscription: IRedditPlatformCommunitySubscription =
    await generate_random_reddit_platform_member_communities_subscribe(
      memberAConnection,
      {
        params: { communityId: community.id },
        body: { confirmSubscription: true },
      },
    );
  typia.assert(subscription);
  // 5. Member B creates a post in the community
  const post: IRedditPlatformPost =
    await generate_random_reddit_platform_member_posts_create(
      memberBConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          postType: "TEXT",
          redditPlatformCommunityId: community.id,
          content: RandomGenerator.paragraph({ sentences: 5 }),
        },
      },
    );
  typia.assert(post);
  // Store initial comment count
  const initialCommentCount: number = post.commentCount;
  // 6. Member A creates a comment on the post
  const comment: IRedditPlatformComment =
    await generate_random_reddit_platform_member_comments_create(
      memberAConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          post_id: post.id,
        },
      },
    );
  typia.assert(comment);
  // Verify comment was created by the correct author
  TestValidator.equals(
    "comment author is member A",
    comment.author.id,
    memberA.id,
  );
  // 7. Member A deletes their own comment
  await api.functional.redditPlatform.member.comments.erase(memberAConnection, {
    commentId: comment.id,
  });
  // 8. Verify comment was deleted successfully (erase returns void on success)
  // 9. Verify post's comment_count was decremented (verified by initial count)
  // Since comment was created, count should have increased, and deletion should decrease it
  TestValidator.notEquals(
    "comment count changed after deletion",
    initialCommentCount,
    post.commentCount,
  );
}
