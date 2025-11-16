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
 * Verify that a community moderator can create an active governance rule
 * without assigning any rule category for a specific community.
 *
 * Business workflow covered:
 *
 * 1. Platform admin joins and creates a community visibility level.
 * 2. Member user joins and creates a community using that visibility level.
 * 3. Community moderator joins and authenticates.
 * 4. Community moderator creates an uncategorized, active rule for the community.
 * 5. Validate that the created rule is active, uncategorized, and structurally
 *    valid.
 */
export async function test_api_community_rule_creation_without_category_by_moderator(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (auto-authenticated)
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(8),
    email: `${RandomGenerator.alphabets(6)}@platform-admin.test`,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://platform-admin.test/join",
    referrer: "https://platform-admin.test/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Platform admin creates a community visibility level
  const visibilityCode = `public_${RandomGenerator.alphabets(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: `Public ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
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
    "visibility level code should match request",
    visibilityLevel.code,
    visibilityCreateBody.code,
  );

  // 3. Member user joins (auto-authenticated)
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(6)}@member-user.test`,
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://member-user.test/join",
    referrer: "https://member-user.test/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Member user creates a community
  const communityIdentifier = `community_${RandomGenerator.alphabets(10)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: `Community ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
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
    "community identifier should match request",
    community.identifier,
    communityCreateBody.identifier,
  );

  // 5. Community moderator joins (auto-authenticated)
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(6)}@community-moderator.test`,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://community-moderator.test/join",
    referrer: "https://community-moderator.test/home",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 6. Community moderator creates an uncategorized, active rule
  const ruleLabel = `NoSpam_${RandomGenerator.alphabets(6)}`;
  const ruleDescription = RandomGenerator.paragraph({ sentences: 10 });

  const ruleCreateBody = {
    label: ruleLabel,
    description: ruleDescription,
    display_order: 10,
    is_active: true,
    rule_category_code: null,
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  const rule: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.communityModerator.communities.rules.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: ruleCreateBody,
      },
    );
  typia.assert(rule);

  // 7. Business assertions on created rule
  TestValidator.equals(
    "rule label should match request",
    rule.label,
    ruleCreateBody.label,
  );

  TestValidator.equals(
    "rule description should match request",
    rule.description,
    ruleCreateBody.description,
  );

  TestValidator.equals(
    "rule display_order should match request",
    rule.display_order,
    ruleCreateBody.display_order,
  );

  TestValidator.equals("rule is_active should be true", rule.is_active, true);

  TestValidator.equals(
    "rule category id should be null or undefined for uncategorized rules",
    rule.rule_category_id ?? null,
    null,
  );

  TestValidator.equals(
    "rule category summary should be null or undefined for uncategorized rules",
    rule.category ?? null,
    null,
  );

  await TestValidator.predicate(
    "community_id in rule should be a non-empty string",
    async () => rule.community_id.length > 0,
  );
}
