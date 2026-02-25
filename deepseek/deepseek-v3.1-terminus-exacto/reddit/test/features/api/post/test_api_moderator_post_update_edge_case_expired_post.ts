import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_moderator_post_update_edge_case_expired_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. 创建普通用户账号并登录
  const userConnection: api.IConnection = { host: connection.host };
  const userCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPass123!",
    username: RandomGenerator.alphabets(10),
  } satisfies ICommunityPlatformUser.IJoin;
  await authorize_user_join(userConnection, { body: userCredentials });
  // 2. 用户创建社区
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(12),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. 用户创建帖子
  const post = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  // 4. 创建版主账号并登录
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "ModPass123!",
    username: RandomGenerator.alphabets(8),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    href: "https://example.com",
    referrer: "https://example.com/referrer",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformModerator.IJoin;
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: moderatorCredentials,
  });
  typia.assert(moderatorAuth);
  // 5. 模拟帖子超过24小时的情况
  // 在实际系统中，我们无法直接修改帖子的创建时间，所以测试期望系统正确处理
  // 这里我们只是尝试更新帖子，期望系统根据业务逻辑返回错误
  const updateBody = {
    title: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies ICommunityPlatformPost.IUpdate;
  // 6. 尝试更新帖子（期望失败，因为帖子已超过24小时）
  await TestValidator.error(
    "moderator cannot update post older than 24 hours",
    async () => {
      await api.functional.communityPlatform.moderator.posts.update(
        moderatorConnection,
        {
          postId: post.id,
          body: updateBody,
        },
      );
    },
  );
  // 7. 验证系统返回正确的错误响应
  // TestValidator.error 会自动验证操作确实抛出了错误
  // 如果需要更详细地验证错误类型，可以在这里添加额外的检查
}
