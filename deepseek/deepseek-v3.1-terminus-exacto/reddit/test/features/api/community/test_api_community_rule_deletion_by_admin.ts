import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_admin_communities_rules_create } from "../../../generate/generate_random_community_platform_admin_communities_rules_create";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_rule } from "../../../prepare/prepare_random_community_platform_community_rule";

/**
 * Test admin community rule deletion functionality.
 *
 * This test validates that an admin can successfully delete community rules,
 * including proper authorization checks and error handling for invalid requests.
 */
export async function test_api_community_rule_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin user
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminCredentials = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create authenticated admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminCredentials.email,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // 2. Create and authenticate regular user (for community creation)
  const userJoinConnection: api.IConnection = { host: connection.host };
  const userCredentials = await authorize_user_join(userJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Create authenticated user connection
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_login(userConnection, {
    body: {
      email: userCredentials.email,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformUser.ILogin,
  });
  // 3. Create a community using the user connection
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Create a community rule using the admin connection
  const rule =
    await generate_random_community_platform_admin_communities_rules_create(
      adminConnection,
      {
        body: {
          rule_text: RandomGenerator.paragraph({ sentences: 2 }),
          rule_order: typia.random<number & tags.Type<"int32">>(),
          is_active: true,
        } satisfies ICommunityPlatformCommunityRule.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(rule);
  // 5. Delete the community rule using the target endpoint
  await api.functional.communityPlatform.admin.communities.rules.erase(
    adminConnection,
    {
      communityId: community.id,
      ruleId: rule.id,
    },
  );
  // 6. Verify rule deletion by attempting to delete again (should fail)
  await TestValidator.error("deleting non-existent rule", async () => {
    await api.functional.communityPlatform.admin.communities.rules.erase(
      adminConnection,
      {
        communityId: community.id,
        ruleId: rule.id,
      },
    );
  });
  // 7. Test error scenario: deleting rule from wrong community
  const wrongCommunityId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("deleting rule from wrong community", async () => {
    await api.functional.communityPlatform.admin.communities.rules.erase(
      adminConnection,
      {
        communityId: wrongCommunityId,
        ruleId: rule.id,
      },
    );
  });
}
