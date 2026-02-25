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

export async function test_api_community_rule_deletion_unauthorized_user(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create regular user account and log in
  const userConnection: api.IConnection = { host: connection.host };
  const userCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    username: RandomGenerator.alphabets(10),
  } satisfies ICommunityPlatformUser.IJoin;
  const userAuth = await authorize_user_join(userConnection, {
    body: userCredentials,
  });
  typia.assert(userAuth);
  // Step 2: User creates a community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(12),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies DeepPartial<ICommunityPlatformCommunity.ICreate>,
      },
    );
  typia.assert(community);
  // Step 3: Create moderator account and log in
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    username: RandomGenerator.alphabets(10),
    display_name: RandomGenerator.name(),
    href: "https://example.com",
    referrer: "https://example.com/referrer",
  } satisfies DeepPartial<ICommunityPlatformModerator.IJoin>;
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: moderatorCredentials,
  });
  typia.assert(moderatorAuth);
  // Step 4: Moderator creates a rule in the user's community
  const rule =
    await generate_random_community_platform_moderator_communities_rules_create(
      moderatorConnection,
      {
        body: {
          rule_text: RandomGenerator.paragraph({ sentences: 1 }),
          rule_order: typia.random<number & tags.Type<"int32">>(),
          is_active: true,
        } satisfies DeepPartial<ICommunityPlatformCommunityRule.ICreate>,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(rule);
  TestValidator.equals("rule is active", rule.is_active, true);
  TestValidator.equals("rule deleted_at is null", rule.deleted_at, null);
  // Step 5: Unauthorized user attempts to delete the rule (should fail)
  await TestValidator.error(
    "unauthorized user cannot delete rule",
    async () => {
      await api.functional.communityPlatform.moderator.communities.rules.erase(
        userConnection, // Regular user connection, not moderator
        {
          communityId: community.id,
          ruleId: rule.id,
        },
      );
    },
  );
  // Step 6: Verify rule still exists and unchanged using moderator connection
  // Note: There's no GET endpoint provided, so we validate by checking the rule data
  // remains unchanged (no deletion happened). We'll rely on the error test above.
  // Ensure no additional validation after typia.assert.
  TestValidator.equals("community id matches", rule.community.id, community.id);
  TestValidator.predicate("rule was created", rule.created_at !== null);
}
