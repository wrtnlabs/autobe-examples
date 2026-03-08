import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
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
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_posts_comments_create } from "../../../generate/generate_random_reddit_platform_member_posts_comments_create";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_comment_deletion_authorization_failure(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create author member account
  const authorAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(authorAuth);
  // 2. Create unauthorized member account
  const unauthorizedAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(unauthorizedAuth);
  // 3. Create community as author
  const authorConnection: api.IConnection = { host: connection.host };
  authorConnection.headers = { Authorization: authorAuth.token.access };
  const community =
    await generate_random_reddit_platform_member_communities_create(
      authorConnection,
      {},
    );
  typia.assert(community);
  // 4. Subscribe author to community (owner is auto-subscribed, but being explicit)
  const subscription =
    await api.functional.redditPlatform.member.communities.subscriptions.create(
      authorConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 5. Create post in the community as author
  const post = await generate_random_reddit_platform_member_posts_create(
    authorConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 6. Create comment on the post as author
  const comment =
    await generate_random_reddit_platform_member_posts_comments_create(
      authorConnection,
      {
        params: { postId: post.id },
        body: {
          body: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  // Verify initial state - comment exists and is not deleted
  TestValidator.predicate(
    "comment not deleted initially",
    comment.deletedAt === null,
  );
  // 7. Create unauthorized user connection
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  unauthorizedConnection.headers = {
    Authorization: unauthorizedAuth.token.access,
  };
  // 8. Attempt to delete author's comment as unauthorized user
  await TestValidator.httpError(
    "unauthorized user cannot delete another user's comment",
    403,
    async () => {
      await api.functional.redditPlatform.member.posts.comments.erase(
        unauthorizedConnection,
        {
          postId: post.id,
          commentId: comment.id,
        },
      );
    },
  );
  // 9. Verify comment still exists and is not deleted
  // The 403 error confirms the deletion was blocked, and deletedAt should remain null
  TestValidator.predicate(
    "comment deletion was blocked and comment remains intact",
    comment.deletedAt === null,
  );
}