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

export async function test_api_community_rule_delete_authorization_validation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create regular user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // Step 2: User creates a community
  const community =
    await api.functional.communityPlatform.user.communities.create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Step 3: Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 4: Admin creates a rule in the community
  const rule =
    await api.functional.communityPlatform.admin.communities.rules.create(
      adminConnection,
      {
        communityId: community.id,
        body: {
          rule_text: RandomGenerator.paragraph({ sentences: 1 }),
          rule_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
          >(),
          is_active: true,
        } satisfies ICommunityPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(rule);
  // Step 5: Attempt to delete rule as regular user (should fail)
  await TestValidator.error("User unauthorized to delete rule", async () => {
    await api.functional.communityPlatform.admin.communities.rules.erase(
      userConnection,
      {
        communityId: community.id,
        ruleId: rule.id,
      },
    );
  });
  // Step 6: Verify rule still exists by attempting to delete with admin
  await api.functional.communityPlatform.admin.communities.rules.erase(
    adminConnection,
    {
      communityId: community.id,
      ruleId: rule.id,
    },
  );
}
