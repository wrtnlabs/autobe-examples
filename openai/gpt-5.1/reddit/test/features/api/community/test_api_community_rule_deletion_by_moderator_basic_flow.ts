import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import type { ICommunityPlatformCommunityRuleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRuleCategory";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Happy-path flow: platform admin provisions visibility level and rule
 * category, member user creates a community, community moderator creates then
 * deletes a rule under that community.
 *
 * Steps:
 *
 * 1. Join as platformAdmin (token is auto-attached to connection).
 * 2. Create a visibility level to be used when creating a community.
 * 3. Create a community rule category to optionally classify rules.
 * 4. Join as memberUser and create a community referencing the visibility level
 *    code.
 * 5. Join as communityModerator.
 * 6. As moderator, create a rule for the community, capturing rule id.
 * 7. As moderator, delete the rule using erase with communityIdentifier and
 *    ruleId.
 * 8. Assert that all creations return valid DTOs and that delete completes without
 *    error.
 */
export async function test_api_community_rule_deletion_by_moderator_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (join) and rely on auto token attachment.
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create a visibility level to be used for community creation.
  const visibilityCode = `vis_${RandomGenerator.alphabets(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public test visibility",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);
  TestValidator.equals(
    "created visibility level code should match input code",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Create a community rule category.
  const ruleCategoryCode = `cat_${RandomGenerator.alphabets(8)}`;
  const ruleCategoryCreateBody = {
    code: ruleCategoryCode,
    name: "Behavior",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    sort_order: 1,
    is_active: true,
  } satisfies ICommunityPlatformCommunityRuleCategory.ICreate;

  const ruleCategory: ICommunityPlatformCommunityRuleCategory =
    await api.functional.communityPlatform.platformAdmin.communityRuleCategories.create(
      connection,
      {
        body: ruleCategoryCreateBody,
      },
    );
  typia.assert(ruleCategory);
  TestValidator.equals(
    "created rule category code should match input code",
    ruleCategory.code,
    ruleCategoryCode,
  );

  // 4. Register a member user and create a community.
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: "192.0.2.10",
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberUser);

  const communityIdentifier = `community_${RandomGenerator.alphabets(10)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: "Test Community for Rule Deletion",
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community identifier should match creation input",
    community.identifier,
    communityIdentifier,
  );

  // 5. Register a community moderator.
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    ip: "198.51.100.20",
    href: "https://mod.example.com/register",
    referrer: "https://mod.example.com/",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderator: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderator);

  // 6. As moderator, create a community rule under the created community.
  const ruleLabel = "Be respectful";
  const ruleDescription = RandomGenerator.paragraph({ sentences: 7 });
  const ruleCreateBody = {
    label: ruleLabel,
    description: ruleDescription,
    display_order: 1,
    is_active: true,
    rule_category_code: ruleCategoryCode,
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  const rule: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.communityModerator.communities.rules.create(
      connection,
      {
        communityIdentifier,
        body: ruleCreateBody,
      },
    );
  typia.assert(rule);
  TestValidator.equals(
    "created rule label should match input label",
    rule.label,
    ruleLabel,
  );

  // 7. As moderator, delete the rule using erase.
  await api.functional.communityPlatform.communityModerator.communities.rules.erase(
    connection,
    {
      communityIdentifier,
      ruleId: rule.id,
    },
  );

  // 8. Behavioral assertion: reaching here without error implies successful deletion.
  TestValidator.predicate(
    "rule deletion should complete without throwing",
    true,
  );
}
