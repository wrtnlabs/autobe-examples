import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
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
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_admin_communities_moderators_create } from "../../../generate/generate_random_community_platform_admin_communities_moderators_create";
import { generate_random_community_platform_moderator_communities_rules_create } from "../../../generate/generate_random_community_platform_moderator_communities_rules_create";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";
import { prepare_random_community_platform_community_rule } from "../../../prepare/prepare_random_community_platform_community_rule";

export async function test_api_community_rule_inactive_creation(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      display_name: "Admin User",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user123",
      username: RandomGenerator.alphabets(8),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Create community as user
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
  // Create moderator connection and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "mod123",
      username: RandomGenerator.alphabets(8),
      display_name: "Community Moderator",
      href: "https://example.com",
      referrer: "https://example.com/referrer",
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  // Assign moderator to community
  const moderatorAssignment =
    await generate_random_community_platform_admin_communities_moderators_create(
      adminConnection,
      {
        params: { communityId: community.id },
        body: {
          user_id: moderator.id,
          role_level: "standard",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);
  // Create inactive rule
  const inactiveRule =
    await generate_random_community_platform_moderator_communities_rules_create(
      moderatorConnection,
      {
        params: { communityId: community.id },
        body: {
          rule_text: RandomGenerator.paragraph({ sentences: 2 }),
          rule_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          is_active: false,
        } satisfies ICommunityPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(inactiveRule);
  // Validate inactive status
  TestValidator.equals(
    "rule should be inactive",
    inactiveRule.is_active,
    false,
  );
  // Validate rule properties
  TestValidator.predicate(
    "rule text should not be empty",
    inactiveRule.rule_text.length > 0,
  );
  TestValidator.predicate(
    "rule order should be positive",
    inactiveRule.rule_order > 0,
  );
  // Validate community association
  TestValidator.equals(
    "rule should belong to correct community",
    inactiveRule.community.id,
    community.id,
  );
  // Validate moderator association
  TestValidator.equals(
    "rule should be created by correct moderator",
    inactiveRule.moderator.id,
    moderator.id,
  );
  // Validate rule ordering functionality
  TestValidator.predicate(
    "rule order should be valid for sorting",
    inactiveRule.rule_order >= 1,
  );
  // Validate that inactive rule is properly stored with all required fields
  TestValidator.predicate(
    "rule should have creation timestamp",
    inactiveRule.created_at.length > 0,
  );
  TestValidator.predicate(
    "rule should have update timestamp",
    inactiveRule.updated_at.length > 0,
  );
  TestValidator.equals(
    "rule should not be deleted",
    inactiveRule.deleted_at,
    null,
  );
}
