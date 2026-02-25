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

export async function test_api_community_rule_hierarchy_multiple_rules_ordering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. Create first community as user
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  const communityA =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityA);
  // Create second community
  const communityB =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityB);
  // 3. Create rules for Community A (order 1,2,3 with mixed is_active)
  const ruleA1 =
    await generate_random_community_platform_admin_communities_rules_create(
      adminConnection,
      {
        params: { communityId: communityA.id },
        body: {
          rule_text: RandomGenerator.paragraph({ sentences: 1 }),
          rule_order: 1 satisfies number as number,
          is_active: true,
        } satisfies ICommunityPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(ruleA1);
  TestValidator.equals(
    "Community A rule 1 associated with correct community",
    ruleA1.community.id,
    communityA.id,
  );
  const ruleA2 =
    await generate_random_community_platform_admin_communities_rules_create(
      adminConnection,
      {
        params: { communityId: communityA.id },
        body: {
          rule_text: RandomGenerator.paragraph({ sentences: 1 }),
          rule_order: 2 satisfies number as number,
          is_active: false,
        } satisfies ICommunityPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(ruleA2);
  TestValidator.equals(
    "Community A rule 2 associated with correct community",
    ruleA2.community.id,
    communityA.id,
  );
  const ruleA3 =
    await generate_random_community_platform_admin_communities_rules_create(
      adminConnection,
      {
        params: { communityId: communityA.id },
        body: {
          rule_text: RandomGenerator.paragraph({ sentences: 1 }),
          rule_order: 3 satisfies number as number,
          is_active: true,
        } satisfies ICommunityPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(ruleA3);
  TestValidator.equals(
    "Community A rule 3 associated with correct community",
    ruleA3.community.id,
    communityA.id,
  );
  // 4. Create rules for Community B (order 1,2)
  const ruleB1 =
    await generate_random_community_platform_admin_communities_rules_create(
      adminConnection,
      {
        params: { communityId: communityB.id },
        body: {
          rule_text: RandomGenerator.paragraph({ sentences: 1 }),
          rule_order: 1 satisfies number as number,
          is_active: true,
        } satisfies ICommunityPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(ruleB1);
  TestValidator.equals(
    "Community B rule 1 associated with correct community",
    ruleB1.community.id,
    communityB.id,
  );
  TestValidator.notEquals(
    "Community B rule 1 not in Community A",
    ruleB1.community.id,
    communityA.id,
  );
  const ruleB2 =
    await generate_random_community_platform_admin_communities_rules_create(
      adminConnection,
      {
        params: { communityId: communityB.id },
        body: {
          rule_text: RandomGenerator.paragraph({ sentences: 1 }),
          rule_order: 2 satisfies number as number,
          is_active: false,
        } satisfies ICommunityPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(ruleB2);
  TestValidator.equals(
    "Community B rule 2 associated with correct community",
    ruleB2.community.id,
    communityB.id,
  );
  TestValidator.notEquals(
    "Community B rule 2 not in Community A",
    ruleB2.community.id,
    communityA.id,
  );
  // 5. Business logic validation
  TestValidator.equals(
    "Community A rules have correct ordering",
    [ruleA1.rule_order, ruleA2.rule_order, ruleA3.rule_order],
    [1, 2, 3],
  );
  TestValidator.equals(
    "Community B rules have correct ordering",
    [ruleB1.rule_order, ruleB2.rule_order],
    [1, 2],
  );
  // 6. Edge case validation
  TestValidator.predicate(
    "Community A has both active and inactive rules",
    ruleA1.is_active === true &&
      ruleA2.is_active === false &&
      ruleA3.is_active === true,
  );
  TestValidator.predicate(
    "Community B has both active and inactive rules",
    ruleB1.is_active === true && ruleB2.is_active === false,
  );
}
