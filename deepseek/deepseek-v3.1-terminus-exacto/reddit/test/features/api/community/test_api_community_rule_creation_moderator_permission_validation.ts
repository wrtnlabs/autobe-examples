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

export async function test_api_community_rule_creation_moderator_permission_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create community as admin (admin has user-level permissions for community creation)
  const community =
    await generate_random_community_platform_user_communities_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: null,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create community rule as admin
  const rule =
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
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(rule);
  // 4. Validate moderator association - admin should be the moderator
  TestValidator.predicate(
    "moderator should have valid moderator properties",
    () => {
      return (
        rule.moderator.id !== undefined &&
        rule.moderator.email !== undefined &&
        rule.moderator.username !== undefined &&
        rule.moderator.display_name !== undefined
      );
    },
  );
  // 5. Validate timestamps
  TestValidator.equals(
    "created_at and updated_at should be identical for new rule",
    rule.created_at,
    rule.updated_at,
  );
  TestValidator.predicate("created_at should be valid ISO timestamp", () => {
    const ruleDate = new Date(rule.created_at);
    return !isNaN(ruleDate.getTime());
  });
  // 6. Validate community association
  TestValidator.equals(
    "rule belongs to correct community",
    rule.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches",
    rule.community.name,
    community.name,
  );
  // 7. Validate rule content
  TestValidator.predicate(
    "rule text should not be empty",
    () => rule.rule_text.length > 0,
  );
  TestValidator.predicate(
    "rule order should be positive",
    () => rule.rule_order > 0,
  );
}
