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
 * Test changing the activation status of a community rule from active to inactive and vice versa.
 * Verifies that the is_active field properly toggles the rule's visibility and enforcement status
 * while preserving all other rule properties including content and ordering.
 */
export async function test_api_community_rule_activation_status_change(
  connection: api.IConnection,
): Promise<void> {
  // Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  // Create admin account
  await authorize_admin_join(adminConnection, {
    body: {
      ...adminCredentials,
      display_name: RandomGenerator.name(),
      permissions_level: "admin",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Login as admin to get proper authentication
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminCredentials.email,
      password: adminCredentials.password,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Create a community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 5,
          }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create initial active rule
  const initialRule =
    await generate_random_community_platform_admin_communities_rules_create(
      adminConnection,
      {
        body: {
          rule_text: RandomGenerator.paragraph({ sentences: 2 }),
          rule_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          is_active: true,
        } satisfies ICommunityPlatformCommunityRule.ICreate,
        params: { communityId: community.id },
      },
    );
  typia.assert(initialRule);
  // Test 1: Deactivate the rule (active → inactive)
  const deactivatedRule =
    await api.functional.communityPlatform.admin.communities.rules.update(
      adminConnection,
      {
        communityId: community.id,
        ruleId: initialRule.id,
        body: {
          is_active: false,
        } satisfies ICommunityPlatformCommunityRule.IUpdate,
      },
    );
  typia.assert(deactivatedRule);
  // Validate deactivation
  TestValidator.equals("rule id unchanged", deactivatedRule.id, initialRule.id);
  TestValidator.equals(
    "rule text unchanged",
    deactivatedRule.rule_text,
    initialRule.rule_text,
  );
  TestValidator.equals(
    "rule order unchanged",
    deactivatedRule.rule_order,
    initialRule.rule_order,
  );
  TestValidator.equals("rule deactivated", deactivatedRule.is_active, false);
  // Test 2: Reactivate the rule (inactive → active)
  const reactivatedRule =
    await api.functional.communityPlatform.admin.communities.rules.update(
      adminConnection,
      {
        communityId: community.id,
        ruleId: initialRule.id,
        body: {
          is_active: true,
        } satisfies ICommunityPlatformCommunityRule.IUpdate,
      },
    );
  typia.assert(reactivatedRule);
  // Validate reactivation
  TestValidator.equals("rule id unchanged", reactivatedRule.id, initialRule.id);
  TestValidator.equals(
    "rule text unchanged",
    reactivatedRule.rule_text,
    initialRule.rule_text,
  );
  TestValidator.equals(
    "rule order unchanged",
    reactivatedRule.rule_order,
    initialRule.rule_order,
  );
  TestValidator.equals("rule reactivated", reactivatedRule.is_active, true);
  // Final validation: Ensure all properties preserved through both transitions
  TestValidator.equals(
    "community reference unchanged",
    reactivatedRule.community.id,
    community.id,
  );
  TestValidator.predicate(
    "updated_at timestamp increased",
    new Date(reactivatedRule.updated_at) > new Date(initialRule.updated_at),
  );
}
