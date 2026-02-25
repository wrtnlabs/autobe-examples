import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_moderator_communities_rules_create } from "../../../generate/generate_random_community_platform_moderator_communities_rules_create";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_rule } from "../../../prepare/prepare_random_community_platform_community_rule";

/**
 * Test validation for rule_order uniqueness within a community.
 * Create a community, create multiple rules with sequential order values,
 * then attempt to update a rule to use the same rule_order as another existing
 * rule in the same community. Verify that the update fails with appropriate
 * validation error. Validate that the system enforces the composite unique
 * constraint on [community_id, rule_order] as specified in the operation
 * specification.
 */
export async function test_api_community_rule_rule_order_uniqueness(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate user
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // 2. Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create and authenticate moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(12),
      href: "https://test.com",
      referrer: "https://test.com",
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  // 4. Create first rule with rule_order = 1
  const rule1 =
    await generate_random_community_platform_moderator_communities_rules_create(
      moderatorConnection,
      {
        params: { communityId: community.id },
        body: {
          rule_text: RandomGenerator.paragraph({ sentences: 2 }),
          rule_order: 1 satisfies number as number,
          is_active: true,
        } satisfies ICommunityPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(rule1);
  // 5. Create second rule with rule_order = 2
  const rule2 =
    await generate_random_community_platform_moderator_communities_rules_create(
      moderatorConnection,
      {
        params: { communityId: community.id },
        body: {
          rule_text: RandomGenerator.paragraph({ sentences: 2 }),
          rule_order: 2 satisfies number as number,
          is_active: true,
        } satisfies ICommunityPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(rule2);
  // 6. Attempt to update first rule to use same rule_order as second rule
  await TestValidator.error(
    "should fail when updating rule_order to duplicate value",
    async () => {
      await api.functional.communityPlatform.moderator.communities.rules.update(
        moderatorConnection,
        {
          communityId: community.id,
          ruleId: rule1.id,
          body: {
            rule_order: rule2.rule_order satisfies number as number,
          } satisfies ICommunityPlatformCommunityRule.IUpdate,
        },
      );
    },
  );
  // 7. Verify successful update with unique rule_order
  const updatedRule1 =
    await api.functional.communityPlatform.moderator.communities.rules.update(
      moderatorConnection,
      {
        communityId: community.id,
        ruleId: rule1.id,
        body: {
          rule_order: 3 satisfies number as number,
        } satisfies ICommunityPlatformCommunityRule.IUpdate,
      },
    );
  typia.assert(updatedRule1);
  TestValidator.equals(
    "rule1 should have updated to unique rule_order",
    updatedRule1.rule_order,
    3,
  );
  TestValidator.equals(
    "rule2 should maintain original rule_order",
    rule2.rule_order,
    2,
  );
}