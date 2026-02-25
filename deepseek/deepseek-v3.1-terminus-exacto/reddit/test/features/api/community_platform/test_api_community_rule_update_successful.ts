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
 * Test the primary success scenario where a moderator updates an existing community rule.
 * First authenticate as moderator, create a community (through user endpoint as per prerequisites),
 * then create a rule, and finally update it with new content, ordering, and activation status.
 * Validate that the rule is updated successfully with all fields (rule_text, rule_order, is_active)
 * properly modified and returned. Verify that the updated_at timestamp reflects the recent
 * modification. Ensure the response includes the complete rule entity with proper community
 * and moderator relationships.
 */
export async function test_api_community_rule_update_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user account and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com`,
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(12),
    },
  });
  typia.assert(userAuth);
  // 2. Create community as user
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
          description: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 5,
            wordMax: 12,
          }),
        },
      },
    );
  typia.assert(community);
  // 3. Create moderator account and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@moderator.com`,
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(12),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(moderatorAuth);
  // 4. Create initial community rule
  const initialRule =
    await generate_random_community_platform_moderator_communities_rules_create(
      moderatorConnection,
      {
        params: { communityId: community.id },
        body: {
          rule_text: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 5,
            wordMax: 10,
          }),
          rule_order: 1,
          is_active: true,
        },
      },
    );
  typia.assert(initialRule);
  // 5. Update the rule with new values
  const updateBody: ICommunityPlatformCommunityRule.IUpdate = {
    rule_text: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 8,
    }),
    rule_order: 2,
    is_active: false,
  };
  const updatedRule =
    await api.functional.communityPlatform.moderator.communities.rules.update(
      moderatorConnection,
      {
        communityId: community.id,
        ruleId: initialRule.id,
        body: updateBody,
      },
    );
  typia.assert(updatedRule);
  // 6. Validate all fields are properly updated
  TestValidator.equals(
    "rule_text should be updated",
    updatedRule.rule_text,
    updateBody.rule_text,
  );
  TestValidator.equals(
    "rule_order should be updated",
    updatedRule.rule_order,
    updateBody.rule_order,
  );
  TestValidator.equals(
    "is_active should be updated",
    updatedRule.is_active,
    updateBody.is_active,
  );
  // 7. Verify updated_at timestamp is more recent than created_at
  const createdTime = new Date(initialRule.created_at).getTime();
  const updatedTime = new Date(updatedRule.updated_at).getTime();
  TestValidator.predicate(
    "updated_at should be more recent than created_at",
    updatedTime > createdTime,
  );
  // 8. Validate community relationship remains intact
  TestValidator.equals(
    "community ID should remain the same",
    updatedRule.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name should remain the same",
    updatedRule.community.name,
    community.name,
  );
  // 9. Validate moderator relationship remains intact
  TestValidator.equals(
    "moderator ID should remain the same",
    updatedRule.moderator.id,
    moderatorAuth.id,
  );
  TestValidator.equals(
    "moderator username should remain the same",
    updatedRule.moderator.username,
    moderatorAuth.username,
  );
}
