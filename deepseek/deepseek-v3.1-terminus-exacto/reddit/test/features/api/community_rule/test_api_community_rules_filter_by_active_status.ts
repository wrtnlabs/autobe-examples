import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityRule";
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

export async function test_api_community_rules_filter_by_active_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as a regular user
  const userConnection: api.IConnection = { host: connection.host };
  const userJoinResult = await authorize_user_join(userConnection, {});
  typia.assert(userJoinResult);
  // 2. Create a community as the user
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // 3. Create and authenticate as a moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoinResult = await authorize_moderator_join(
    moderatorConnection,
    {},
  );
  typia.assert(moderatorJoinResult);
  // 4. Create a mix of active and inactive rules
  const ruleCount = 6;
  const createdRules = [];
  for (let i = 0; i < ruleCount; i++) {
    const isActive = i % 2 === 0; // alternating active/inactive
    const rule =
      await generate_random_community_platform_moderator_communities_rules_create(
        moderatorConnection,
        {
          params: { communityId: community.id },
          body: {
            rule_text: RandomGenerator.paragraph({ sentences: 2 }),
            rule_order: i + 1,
            is_active: isActive,
          },
        },
      );
    typia.assert(rule);
    createdRules.push(rule);
  }
  // 5. Filter only active rules
  const activeResponse =
    await api.functional.communityPlatform.communities.rules.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          isActive: true,
        },
      },
    );
  typia.assert(activeResponse);
  // 5. Filter only inactive rules
  const inactiveResponse =
    await api.functional.communityPlatform.communities.rules.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          isActive: false,
        },
      },
    );
  typia.assert(inactiveResponse);
  // 5. Get all rules (no filter)
  const allResponse =
    await api.functional.communityPlatform.communities.rules.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {},
      },
    );
  typia.assert(allResponse);
  // 6. Validate filtering correctness
  const expectedActiveRules = createdRules.filter((rule) => rule.is_active);
  const expectedInactiveRules = createdRules.filter((rule) => !rule.is_active);
  TestValidator.equals(
    "active rules count matches",
    activeResponse.data.length,
    expectedActiveRules.length,
  );
  TestValidator.equals(
    "inactive rules count matches",
    inactiveResponse.data.length,
    expectedInactiveRules.length,
  );
  TestValidator.equals(
    "all rules count matches",
    allResponse.data.length,
    createdRules.length,
  );
  // Check that each rule in active response has is_active = true
  for (const rule of activeResponse.data) {
    TestValidator.predicate("active rule has is_active = true", rule.is_active);
  }
  // Check that each rule in inactive response has is_active = false
  for (const rule of inactiveResponse.data) {
    TestValidator.predicate(
      "inactive rule has is_active = false",
      !rule.is_active,
    );
  }
  // 7. Verify rule_order sorting is maintained
  const checkOrderPreserved = (
    response: IPageICommunityPlatformCommunityRule.ISummary,
  ) => {
    for (let i = 1; i < response.data.length; i++) {
      TestValidator.predicate(
        "rule_order is sorted ascending",
        response.data[i - 1].rule_order <= response.data[i].rule_order,
      );
    }
  };
  checkOrderPreserved(activeResponse);
  checkOrderPreserved(inactiveResponse);
  checkOrderPreserved(allResponse);
  // 8. Ensure no soft-deleted rules appear (all deleted_at should be null)
  for (const rule of allResponse.data) {
    TestValidator.equals("rule not soft-deleted", rule.deleted_at, null);
  }
}
