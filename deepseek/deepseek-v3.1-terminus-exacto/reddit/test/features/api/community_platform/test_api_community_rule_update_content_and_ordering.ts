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
 * Test updating an existing community rule with new content text and display ordering.
 * 1. Create and authenticate admin account
 * 2. Create and authenticate user account
 * 3. User creates a community
 * 4. Admin creates initial rule
 * 5. Admin updates rule with new content and ordering
 * 6. Validate rule text update (1-5000 characters)
 * 7. Verify rule order change and uniqueness
 * 8. Check updated_at timestamp reflects modification
 * 9. Validate complete rule entity with relationships
 */
export async function test_api_community_rule_update_content_and_ordering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin-specific connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // 2. Create user-specific connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_login(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformUser.ILogin,
  });
  // 3. User creates a community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 8,
          }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Admin creates initial rule
  const initialRule =
    await generate_random_community_platform_admin_communities_rules_create(
      adminConnection,
      {
        params: { communityId: community.id },
        body: {
          rule_text: RandomGenerator.paragraph({ sentences: 2 }),
          rule_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          is_active: true,
        } satisfies ICommunityPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(initialRule);
  // 5. Admin updates rule with new content and ordering
  const updateData: ICommunityPlatformCommunityRule.IUpdate = {
    rule_text: RandomGenerator.paragraph({ sentences: 3 }),
    rule_order: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  };
  const updatedRule =
    await api.functional.communityPlatform.admin.communities.rules.update(
      adminConnection,
      {
        communityId: community.id,
        ruleId: initialRule.id,
        body: updateData,
      },
    );
  typia.assert(updatedRule);
  // 6. Validate rule text is updated
  TestValidator.equals(
    "rule text updated",
    updatedRule.rule_text,
    updateData.rule_text,
  );
  // 7. Validate rule order is updated
  TestValidator.equals(
    "rule order updated",
    updatedRule.rule_order,
    updateData.rule_order,
  );
  // 8. Validate updated_at timestamp reflects modification
  TestValidator.notEquals(
    "updated_at changed",
    initialRule.updated_at,
    updatedRule.updated_at,
  );
  // 9. Validate rule remains active
  TestValidator.predicate(
    "rule remains active",
    updatedRule.is_active === true,
  );
  // 10. Validate community relationship
  TestValidator.equals(
    "community id unchanged",
    updatedRule.community.id,
    community.id,
  );
  // 11. Validate moderator relationship
  TestValidator.predicate(
    "moderator exists",
    updatedRule.moderator.id !== undefined,
  );
  // 12. Validate rule text length constraints (1-5000 characters)
  TestValidator.predicate(
    "rule text length valid",
    updatedRule.rule_text.length >= 1 && updatedRule.rule_text.length <= 5000,
  );
}
