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

export async function test_api_comment_deletion_unauthorized_already_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
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
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(ownerAuth);
  ownerConnection.headers ??= {};
  ownerConnection.headers.Authorization = ownerAuth.token.access;
  // 2. Create community
  const community =
    await api.functional.redditPlatform.member.communities.create(
      ownerConnection,
      {
        body: {
          name: typia.random<string & tags.MinLength<1>>(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create comment author
  const authorConnection: api.IConnection = { host: connection.host };
  const authorAuth = await authorize_member_join(authorConnection, {
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
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(authorAuth);
  authorConnection.headers ??= {};
  authorConnection.headers.Authorization = authorAuth.token.access;
  // 4. Subscribe author to community
  await api.functional.redditPlatform.member.communities.subscribe(
    authorConnection,
    {
      communityId: community.id,
      body: {
        confirmSubscription: true,
      } satisfies IRedditPlatformCommunitySubscription.ICreate,
    },
  );
  // 5. Create post in community by author
  const post = await api.functional.redditPlatform.member.posts.create(
    authorConnection,
    {
      body: {
        title: typia.random<string & tags.MinLength<1> & tags.MaxLength<300>>(),
        postType: "TEXT" as const,
        redditPlatformCommunityId: community.id,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 6. Create first comment by author
  const firstComment =
    await api.functional.redditPlatform.member.comments.create(
      authorConnection,
      {
        body: {
          post_id: post.id,
          content: typia.random<string & tags.MinLength<1>>(),
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(firstComment);
  // 7. Create second comment by author
  const secondComment =
    await api.functional.redditPlatform.member.comments.create(
      authorConnection,
      {
        body: {
          post_id: post.id,
          content: typia.random<string & tags.MinLength<1>>(),
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(secondComment);
  // 8. Create unauthorized attempt member
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  const unauthorizedAuth = await authorize_member_join(unauthorizedConnection, {
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
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(unauthorizedAuth);
  unauthorizedConnection.headers ??= {};
  unauthorizedConnection.headers.Authorization = unauthorizedAuth.token.access;
  // 9. Test unauthorized deletion (non-owner, non-moderator)
  await TestValidator.error(
    "unauthorized user cannot delete another user's comment",
    async () => {
      await api.functional.redditPlatform.member.comments.erase(
        unauthorizedConnection,
        {
          commentId: firstComment.id,
        },
      );
    },
  );
  // 10. Author deletes their second comment
  await api.functional.redditPlatform.member.comments.erase(authorConnection, {
    commentId: secondComment.id,
  });
  // 11. Test deletion of already deleted comment
  await TestValidator.error(
    "already deleted comment cannot be deleted again",
    async () => {
      await api.functional.redditPlatform.member.comments.erase(
        unauthorizedConnection,
        {
          commentId: secondComment.id,
        },
      );
    },
  );
}
