import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_communities_moderators_create } from "../../../generate/generate_random_community_platform_user_communities_moderators_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";

/**
 * 测试社区版主筛选端点：包含角色级别过滤和文本搜索。
 */
export async function test_api_community_moderators_role_level_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. 创建社区拥有者
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_user_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(owner);
  // 2. 创建测试社区
  const community =
    await generate_random_community_platform_user_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. 准备版主用户
  const moderatorUserIds: (string & tags.Format<"uuid">)[] = [];
  for (let i = 0; i < 5; i++) {
    const userConnection: api.IConnection = { host: connection.host };
    const user = await authorize_user_join(userConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.alphaNumeric(12),
      } satisfies ICommunityPlatformUser.IJoin,
    });
    typia.assert(user);
    moderatorUserIds.push(user.id);
  }
  // 4. 分配不同角色级别的版主
  const roleLevels = ["senior", "junior", "temporary"] as const;
  const assignmentNotes = [
    "Senior moderator with full permissions",
    "Junior moderator with limited permissions",
    "Temporary moderator for special event",
  ];
  for (let i = 0; i < moderatorUserIds.length; i++) {
    const roleIndex = i % roleLevels.length;
    const noteIndex = i % assignmentNotes.length;
    const moderator =
      await generate_random_community_platform_user_communities_moderators_create(
        ownerConnection,
        {
          params: { communityId: community.id },
          body: {
            user_id: moderatorUserIds[i],
            role_level: roleLevels[roleIndex],
            notes: assignmentNotes[noteIndex],
          } satisfies ICommunityPlatformCommunityModerator.ICreate,
        },
      );
    typia.assert(moderator);
  }
  // 5. 测试角色级别筛选
  const seniorModerators =
    await api.functional.communityPlatform.communities.moderators.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          role_level: "senior",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(seniorModerators);
  TestValidator.equals(
    "senior moderators count",
    seniorModerators.data.length,
    2,
  );
  // 6. 测试文本搜索
  const searchResults =
    await api.functional.communityPlatform.communities.moderators.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          search: "full permissions",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(searchResults);
  TestValidator.predicate(
    "search results contain target",
    searchResults.data.length > 0,
  );
  // 7. 测试组合筛选
  const combinedResults =
    await api.functional.communityPlatform.communities.moderators.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          role_level: "senior",
          search: "full permissions",
          is_active: true,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(combinedResults);
  // 8. 测试分页元数据
  const paginationTest =
    await api.functional.communityPlatform.communities.moderators.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(paginationTest);
  TestValidator.equals(
    "pagination records",
    paginationTest.pagination.records,
    5,
  );
  TestValidator.equals("pagination pages", paginationTest.pagination.pages, 3);
}
