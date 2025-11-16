import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityGovernance } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityGovernance";
import type { ICommunityPlatformCommunityGovernanceCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityGovernanceCommunity";
import type { ICommunityPlatformCommunityModerationSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerationSummary";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorAssignment";
import type { ICommunityPlatformCommunityModeratorIdentitySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorIdentitySummary";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import type { ICommunityPlatformCommunityRuleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRuleCategory";
import type { ICommunityPlatformCommunityRuleCategorySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRuleCategorySummary";
import type { ICommunityPlatformCommunityRuleSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRuleSummary";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_community_governance_inactive_rules_and_categories_filtering(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (auto-authenticated)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string = RandomGenerator.alphabets(12);

  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: adminEmail,
    password: adminPassword,
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create two rule categories: one active, one inactive
  const activeCategoryCode = `behavior_active_${RandomGenerator.alphabets(8)}`;
  const inactiveCategoryCode = `behavior_inactive_${RandomGenerator.alphabets(
    8,
  )}`;

  const activeCategoryBody = {
    code: activeCategoryCode,
    name: "Active behavior rules",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    sort_order: 1 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies ICommunityPlatformCommunityRuleCategory.ICreate;

  const inactiveCategoryBody = {
    code: inactiveCategoryCode,
    name: "Inactive behavior rules",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    sort_order: 2 as number & tags.Type<"int32">,
    is_active: false,
  } satisfies ICommunityPlatformCommunityRuleCategory.ICreate;

  const activeCategory: ICommunityPlatformCommunityRuleCategory =
    await api.functional.communityPlatform.platformAdmin.communityRuleCategories.create(
      connection,
      { body: activeCategoryBody },
    );
  typia.assert(activeCategory);

  const inactiveCategory: ICommunityPlatformCommunityRuleCategory =
    await api.functional.communityPlatform.platformAdmin.communityRuleCategories.create(
      connection,
      { body: inactiveCategoryBody },
    );
  typia.assert(inactiveCategory);

  // 3. Create a visibility level
  const visibilityCode = `public-gov-${RandomGenerator.alphabets(6)}`;
  const visibilityBody = {
    code: visibilityCode,
    name: "Public Governance Test",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityBody },
    );
  typia.assert(visibilityLevel);

  // 4. Member user join (auto-auth as memberUser)
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string = RandomGenerator.alphabets(10);

  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: memberEmail,
    password: memberPassword,
    ip: "127.0.0.1",
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 5. Member creates community
  const communityIdentifier = `gov-test-${RandomGenerator.alphabets(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: `Governance Test Community ${RandomGenerator.alphabets(4)}`,
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 6. Community moderator join (auto-auth as moderator)
  const moderatorEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const moderatorPassword: string = RandomGenerator.alphabets(10);

  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: moderatorEmail,
    password: moderatorPassword,
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://moderator.example.com/join",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 7. Switch back to platformAdmin to assign moderator
  const adminLoginBody = {
    identifier: adminEmail,
    password: adminPassword,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminReAuth: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminReAuth);

  const moderatorAssignmentBody = {
    communityModeratorId: moderatorAuthorized.id,
    assignedAt: new Date().toISOString(),
    revokedAt: null,
    isActive: true,
  } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate;

  const moderatorAssignment: ICommunityPlatformCommunityModeratorAssignment =
    await api.functional.communityPlatform.platformAdmin.communities.moderatorAssignments.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: moderatorAssignmentBody,
      },
    );
  typia.assert(moderatorAssignment);

  // 8. Switch to communityModerator for rule creation
  const moderatorLoginBody = {
    identifier: moderatorEmail,
    password: moderatorPassword,
    ip: "127.0.0.1",
    href: "https://moderator.example.com/login",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorReAuth: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorReAuth);

  // Create Rule A: active rule, active category
  const ruleALabel = "Rule A - active/active";
  const ruleABody = {
    label: ruleALabel,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    display_order: 1 as number & tags.Type<"int32">,
    is_active: true,
    rule_category_code: activeCategory.code,
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  const ruleA: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.communityModerator.communities.rules.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: ruleABody,
      },
    );
  typia.assert(ruleA);

  // Create Rule B: active rule, inactive category
  const ruleBLabel = "Rule B - active/inactive";
  const ruleBBody = {
    label: ruleBLabel,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    display_order: 2 as number & tags.Type<"int32">,
    is_active: true,
    rule_category_code: inactiveCategory.code,
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  const ruleB: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.communityModerator.communities.rules.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: ruleBBody,
      },
    );
  typia.assert(ruleB);

  // Create Rule C: inactive rule, active category
  const ruleCLabel = "Rule C - inactive/active";
  const ruleCBody = {
    label: ruleCLabel,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    display_order: 3 as number & tags.Type<"int32">,
    is_active: false,
    rule_category_code: activeCategory.code,
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  const ruleC: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.communityModerator.communities.rules.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: ruleCBody,
      },
    );
  typia.assert(ruleC);

  // 9. Call governance endpoint unauthenticated
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  const governance: ICommunityPlatformCommunityGovernance =
    await api.functional.communityPlatform.communities.governance.at(
      unauthConn,
      { communityIdentifier: community.identifier },
    );
  typia.assert(governance);

  // 10. Business assertions
  // Community identity
  TestValidator.equals(
    "governance community identifier matches created community",
    governance.community.identifier,
    community.identifier,
  );

  // Find rule summaries by label
  const ruleSummaries: ICommunityPlatformCommunityRuleSummary[] =
    governance.rules;

  const summaryA = ruleSummaries.find((r) => r.label === ruleALabel);
  const summaryB = ruleSummaries.find((r) => r.label === ruleBLabel);
  const summaryC = ruleSummaries.find((r) => r.label === ruleCLabel);

  TestValidator.predicate(
    "rule A summary is present",
    () => summaryA !== undefined,
  );
  TestValidator.predicate(
    "rule B summary is present",
    () => summaryB !== undefined,
  );
  TestValidator.predicate(
    "rule C summary is present",
    () => summaryC !== undefined,
  );

  if (!summaryA || !summaryB || !summaryC) return;

  // isActive flags must reflect rule creation payloads
  TestValidator.equals(
    "rule A is active in governance summary",
    summaryA.isActive,
    true,
  );
  TestValidator.equals(
    "rule B is active in governance summary",
    summaryB.isActive,
    true,
  );
  TestValidator.equals(
    "rule C is inactive in governance summary",
    summaryC.isActive,
    false,
  );

  // Category wiring on rule summaries
  TestValidator.predicate(
    "rule A category is present",
    () => summaryA.ruleCategory !== undefined && summaryA.ruleCategory !== null,
  );
  TestValidator.predicate(
    "rule B category is present",
    () => summaryB.ruleCategory !== undefined && summaryB.ruleCategory !== null,
  );
  TestValidator.predicate(
    "rule C category is present",
    () => summaryC.ruleCategory !== undefined && summaryC.ruleCategory !== null,
  );

  if (
    !summaryA.ruleCategory ||
    !summaryB.ruleCategory ||
    !summaryC.ruleCategory
  ) {
    return;
  }

  TestValidator.equals(
    "rule A category is active",
    summaryA.ruleCategory.isActive,
    true,
  );
  TestValidator.equals(
    "rule B category is inactive",
    summaryB.ruleCategory.isActive,
    false,
  );
  TestValidator.equals(
    "rule C category is active",
    summaryC.ruleCategory.isActive,
    true,
  );

  // ruleCategories collection should contain both categories
  const categorySummaries: ICommunityPlatformCommunityRuleCategorySummary[] =
    governance.ruleCategories;

  const govActiveCategory = categorySummaries.find(
    (c) => c.id === activeCategory.id,
  );
  const govInactiveCategory = categorySummaries.find(
    (c) => c.id === inactiveCategory.id,
  );

  TestValidator.predicate(
    "active category appears in governance ruleCategories",
    () => govActiveCategory !== undefined,
  );
  TestValidator.predicate(
    "inactive category appears in governance ruleCategories",
    () => govInactiveCategory !== undefined,
  );

  if (!govActiveCategory || !govInactiveCategory) return;

  TestValidator.equals(
    "governance active category isActive=true",
    govActiveCategory.isActive,
    true,
  );
  TestValidator.equals(
    "governance inactive category isActive=false",
    govInactiveCategory.isActive,
    false,
  );

  // Moderation summary
  const moderation: ICommunityPlatformCommunityModerationSummary =
    governance.moderation;
  typia.assert(moderation);

  TestValidator.predicate(
    "moderation summary has at least one moderator",
    moderation.totalModerators > 0,
  );

  const moderatorInSummary:
    | ICommunityPlatformCommunityModeratorIdentitySummary
    | undefined = moderation.moderators.find(
    (m) => m.id === moderatorAuthorized.id,
  );

  TestValidator.predicate(
    "assigned moderator appears in governance moderation summary",
    () => moderatorInSummary !== undefined,
  );

  // Optional: ensure rules are sorted by displayOrder ascending
  const sortedByDisplayOrder = [...ruleSummaries].sort(
    (a, b) => a.displayOrder - b.displayOrder,
  );
  TestValidator.equals(
    "governance rules are ordered by displayOrder",
    ruleSummaries.map((r) => r.id),
    sortedByDisplayOrder.map((r) => r.id),
  );
}
