import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_comment_update_unauthorized_non_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. First member setup - creates community, post, and comment
  const firstMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(firstMemberConnection, {});
  // 2. First member creates community
  const community =
    await generate_random_community_platform_member_communities_create(
      firstMemberConnection,
      {},
    );
  // 3. First member subscribes to their community (required for posting)
  await generate_random_community_platform_member_subscriptions_create(
    firstMemberConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  // 4. First member creates post
  const post = await generate_random_community_platform_member_posts_create(
    firstMemberConnection,
    {
      body: {
        communityId: community.id,
      },
    },
  );
  // 5. First member creates comment
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      firstMemberConnection,
      {
        params: {
          postId: post.id,
        },
      },
    );
  // 6. Second member setup
  const secondMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(secondMemberConnection, {});
  // 7. Second member subscribes to the same community (for visibility)
  await generate_random_community_platform_member_subscriptions_create(
    secondMemberConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  // 8. Second member attempts to update first member's comment
  // Expected: HTTP 403 Forbidden (non-author cannot update)
  await TestValidator.httpError(
    "non-author cannot update comment",
    403,
    async () => {
      await api.functional.communityPlatform.member.posts.comments.update(
        secondMemberConnection,
        {
          postId: post.id,
          commentId: comment.id,
          body: {
            content: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies ICommunityPlatformComment.IUpdate,
        },
      );
    },
  );
}
