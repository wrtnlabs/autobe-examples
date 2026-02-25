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

export async function test_api_community_rule_creation_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. User setup and community creation
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 5,
          }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Moderator setup
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  // 4. Assign moderator to community via admin
  const moderatorAssignment =
    await generate_random_community_platform_admin_communities_moderators_create(
      adminConnection,
      {
        body: {
          user_id: moderator.id,
          role_level: "moderator",
          notes: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(moderatorAssignment);
  // 5. Create community rule as moderator
  const rule =
    await generate_random_community_platform_moderator_communities_rules_create(
      moderatorConnection,
      {
        body: {
          rule_text: RandomGenerator.paragraph({ sentences: 2 }),
          rule_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
          >(),
          is_active: true,
        } satisfies ICommunityPlatformCommunityRule.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(rule);
  // 6. Validate response fields
  TestValidator.equals("rule has id", typeof rule.id, "string");
  TestValidator.predicate("rule text is not empty", rule.rule_text.length > 0);
  TestValidator.predicate("rule order is positive", rule.rule_order >= 1);
  TestValidator.equals("rule is active", rule.is_active, true);
  TestValidator.equals("created_at is set", typeof rule.created_at, "string");
  TestValidator.equals("updated_at is set", typeof rule.updated_at, "string");
  TestValidator.equals("deleted_at is null", rule.deleted_at, null);
  // 7. Validate community relation
  TestValidator.equals("community id matches", rule.community.id, community.id);
  TestValidator.equals(
    "community name matches",
    rule.community.name,
    community.name,
  );
  // 8. Validate moderator relation
  TestValidator.equals("moderator has id", typeof rule.moderator.id, "string");
  TestValidator.equals(
    "moderator has email",
    typeof rule.moderator.email,
    "string",
  );
  TestValidator.equals(
    "moderator has username",
    typeof rule.moderator.username,
    "string",
  );
  // 9. Test creating another rule with different order to ensure functionality
  const secondRule =
    await generate_random_community_platform_moderator_communities_rules_create(
      moderatorConnection,
      {
        body: {
          rule_text: RandomGenerator.paragraph({ sentences: 2 }),
          rule_order: rule.rule_order + 1,
          is_active: false,
        } satisfies ICommunityPlatformCommunityRule.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(secondRule);
  TestValidator.notEquals(
    "second rule has different id",
    rule.id,
    secondRule.id,
  );
  TestValidator.notEquals(
    "second rule has different order",
    rule.rule_order,
    secondRule.rule_order,
  );
}
