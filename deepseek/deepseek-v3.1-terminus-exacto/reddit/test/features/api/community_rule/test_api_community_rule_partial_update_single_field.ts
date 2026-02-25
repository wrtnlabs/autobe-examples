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
 * Test partial updates to community rules by modifying only one field at a time.
 * Validates that partial DTO updates correctly preserve unchanged fields.
 */
export async function test_api_community_rule_partial_update_single_field(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup user authentication for community creation
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user1234",
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: null,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // 2. Create a community with user actor
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: null,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Setup admin authentication for rule management
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin1234",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // 4. Create initial community rule with admin actor
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
  // 5. Test partial update - rule_text only
  const updatedRuleText = RandomGenerator.paragraph({ sentences: 3 });
  const ruleAfterTextUpdate =
    await api.functional.communityPlatform.admin.communities.rules.update(
      adminConnection,
      {
        communityId: community.id,
        ruleId: initialRule.id,
        body: {
          rule_text: updatedRuleText,
        } satisfies ICommunityPlatformCommunityRule.IUpdate,
      },
    );
  typia.assert(ruleAfterTextUpdate);
  // Validate rule_text updated, other fields unchanged
  TestValidator.equals(
    "rule_text should be updated",
    ruleAfterTextUpdate.rule_text,
    updatedRuleText,
  );
  TestValidator.equals(
    "rule_order should remain unchanged",
    ruleAfterTextUpdate.rule_order,
    initialRule.rule_order,
  );
  TestValidator.equals(
    "is_active should remain unchanged",
    ruleAfterTextUpdate.is_active,
    initialRule.is_active,
  );
  // 6. Test partial update - rule_order only
  const updatedRuleOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  const ruleAfterOrderUpdate =
    await api.functional.communityPlatform.admin.communities.rules.update(
      adminConnection,
      {
        communityId: community.id,
        ruleId: initialRule.id,
        body: {
          rule_order: updatedRuleOrder,
        } satisfies ICommunityPlatformCommunityRule.IUpdate,
      },
    );
  typia.assert(ruleAfterOrderUpdate);
  // Validate rule_order updated, other fields unchanged
  TestValidator.equals(
    "rule_text should remain unchanged",
    ruleAfterOrderUpdate.rule_text,
    updatedRuleText,
  );
  TestValidator.equals(
    "rule_order should be updated",
    ruleAfterOrderUpdate.rule_order,
    updatedRuleOrder,
  );
  TestValidator.equals(
    "is_active should remain unchanged",
    ruleAfterOrderUpdate.is_active,
    initialRule.is_active,
  );
  // 7. Test partial update - is_active only
  const ruleAfterActiveUpdate =
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
  typia.assert(ruleAfterActiveUpdate);
  // Validate is_active updated, other fields unchanged
  TestValidator.equals(
    "rule_text should remain unchanged",
    ruleAfterActiveUpdate.rule_text,
    updatedRuleText,
  );
  TestValidator.equals(
    "rule_order should remain unchanged",
    ruleAfterActiveUpdate.rule_order,
    updatedRuleOrder,
  );
  TestValidator.equals(
    "is_active should be updated",
    ruleAfterActiveUpdate.is_active,
    false,
  );
}
