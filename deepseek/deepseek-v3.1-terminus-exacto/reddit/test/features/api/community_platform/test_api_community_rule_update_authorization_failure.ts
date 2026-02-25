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
 * Test authorization failure when a non-moderator attempts to update a community rule.
 *
 * This test validates that only moderators assigned to a specific community can modify
 * its rules. It creates a community with a regular user, establishes a rule using
 * moderator authorization, then attempts to update the rule using a different moderator
 * account that lacks permissions for that specific community.
 */
export async function test_api_community_rule_update_authorization_failure(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate first regular user (community owner)
  const userConnection1: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // 2. Create community using first user
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection1,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create and authenticate first moderator account (has permissions)
  const moderatorConnection1: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  // 4. Create initial rule using first moderator
  const rule =
    await generate_random_community_platform_moderator_communities_rules_create(
      moderatorConnection1,
      {
        params: { communityId: community.id },
        body: {
          rule_text: RandomGenerator.paragraph({ sentences: 3 }),
          rule_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          is_active: true,
        } satisfies ICommunityPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(rule);
  // 5. Create and authenticate second moderator account (no permissions for this community)
  const moderatorConnection2: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  // 6. Attempt to update rule using second moderator (should fail - no permissions for this community)
  await TestValidator.error(
    "moderator without community permissions should not be able to update rule",
    async () => {
      await api.functional.communityPlatform.moderator.communities.rules.update(
        moderatorConnection2,
        {
          communityId: community.id,
          ruleId: rule.id,
          body: {
            rule_text: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies ICommunityPlatformCommunityRule.IUpdate,
        },
      );
    },
  );
}
