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

export async function test_api_community_rule_creation_active_inactive_toggle(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication using join (utility function exists)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. Create community as prerequisite
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: null,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  const community =
    await api.functional.communityPlatform.user.communities.create(
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
  // 3. Create first active rule
  const activeRule =
    await api.functional.communityPlatform.admin.communities.rules.create(
      adminConnection,
      {
        communityId: community.id,
        body: {
          rule_text: RandomGenerator.paragraph({ sentences: 2 }),
          rule_order: 1,
          is_active: true,
        } satisfies ICommunityPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(activeRule);
  // 4. Create second inactive rule
  const inactiveRule =
    await api.functional.communityPlatform.admin.communities.rules.create(
      adminConnection,
      {
        communityId: community.id,
        body: {
          rule_text: RandomGenerator.paragraph({ sentences: 2 }),
          rule_order: 2,
          is_active: false,
        } satisfies ICommunityPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(inactiveRule);
  // 5. Validate rule properties
  TestValidator.equals("active rule is_active", activeRule.is_active, true);
  TestValidator.equals(
    "inactive rule is_active",
    inactiveRule.is_active,
    false,
  );
  TestValidator.equals("active rule order", activeRule.rule_order, 1);
  TestValidator.equals("inactive rule order", inactiveRule.rule_order, 2);
  TestValidator.notEquals(
    "rule texts differ",
    activeRule.rule_text,
    inactiveRule.rule_text,
  );
  // 6. Validate moderator mapping and rule relationships
  TestValidator.predicate(
    "rules have valid IDs",
    activeRule.id !== inactiveRule.id &&
      typeof activeRule.id === "string" &&
      typeof inactiveRule.id === "string",
  );
  TestValidator.predicate(
    "rules belong to same community",
    activeRule.community.id === community.id &&
      inactiveRule.community.id === community.id,
  );
  TestValidator.predicate(
    "rules have moderator information",
    activeRule.moderator !== null &&
      inactiveRule.moderator !== null &&
      typeof activeRule.moderator.id === "string" &&
      typeof inactiveRule.moderator.id === "string",
  );
}
