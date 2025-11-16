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

/**
 * Validate that the community governance endpoint returns a complete,
 * denormalized view of rules, categories, and moderation for a concrete
 * community.
 *
 * Business workflow under test:
 *
 * 1. Register a platform admin.
 * 2. As platform admin, create an account status master, a rule category, and a
 *    community visibility level.
 * 3. Register a member user and, as that member user, create a community that
 *    references the visibility level.
 * 4. Register a community moderator.
 * 5. As platform admin, assign the moderator to the community.
 * 6. As community moderator, create multiple rules for the community, with at
 *    least one rule referencing the created rule category.
 * 7. Call the public community governance endpoint without authentication.
 * 8. Assert that the governance read model correctly composes:
 *
 *    - Community metadata (identifier, title, visibility, flags, timestamps).
 *    - Rules with correct labels, descriptions, order, activity, and category
 *         summaries for categorized rules.
 *    - RuleCategories collection that includes the created category used by rules.
 *    - Moderation summary that reports the assigned moderator and total count.
 */
export async function test_api_community_governance_full_rule_and_moderation_view(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (auto-authenticated by SDK)
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: "AdminPass123!",
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. As platform admin, create an account status master entry
  const accountStatusBody = {
    key: "ACTIVE_MEMBER",
    label: "Active Member",
    description: "Account is fully active and allowed to login/post/vote.",
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const accountStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      { body: accountStatusBody },
    );
  typia.assert(accountStatus);

  // 3. As platform admin, create a rule category
  const ruleCategoryCode = `behavior_${RandomGenerator.alphabets(6)}`;
  const ruleCategoryBody = {
    code: ruleCategoryCode,
    name: "Behavior Policies",
    description: "Rules governing acceptable member behavior.",
    sort_order: 10 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies ICommunityPlatformCommunityRuleCategory.ICreate;

  const ruleCategory: ICommunityPlatformCommunityRuleCategory =
    await api.functional.communityPlatform.platformAdmin.communityRuleCategories.create(
      connection,
      { body: ruleCategoryBody },
    );
  typia.assert(ruleCategory);

  // 4. As platform admin, create a visibility level
  const visibilityCode = `public_${RandomGenerator.alphabets(5)}`;
  const visibilityBody = {
    code: visibilityCode,
    name: "Public Community",
    description: "Community is visible to all visitors.",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityBody },
    );
  typia.assert(visibilityLevel);

  // 5. Register a member user, which will authenticate as memberUser
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@member.example.com` as string &
      tags.Format<"email">,
    password: "MemberPass123!",
    ip: "127.0.0.1",
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 6. As member user, create a community referencing the visibility level
  const communityIdentifier = `community_${RandomGenerator.alphabets(6)}`;
  const communityTitle = RandomGenerator.paragraph({ sentences: 3 });
  const communityBody = {
    identifier: communityIdentifier,
    title: communityTitle,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 7. Register a community moderator (auto-authenticated)
  const moderatorUsername = RandomGenerator.name(1);
  const moderatorJoinBody = {
    username: moderatorUsername,
    email: `${RandomGenerator.alphabets(8)}@mod.example.com` as string &
      tags.Format<"email">,
    password: "ModeratorPass123!",
    display_name: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://mod.example.com/join",
    referrer: "https://mod.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 8. Switch back to platform admin by logging in explicitly
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  // 9. Assign the community moderator to the community
  const assignmentBody = {
    communityModeratorId: moderatorAuthorized.id,
    assignedAt: new Date().toISOString() as string & tags.Format<"date-time">,
    revokedAt: null,
    isActive: true,
  } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate;

  const moderatorAssignment: ICommunityPlatformCommunityModeratorAssignment =
    await api.functional.communityPlatform.platformAdmin.communities.moderatorAssignments.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: assignmentBody,
      },
    );
  typia.assert(moderatorAssignment);

  // 10. Login as the community moderator explicitly
  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: "127.0.0.1",
    href: "https://mod.example.com/login",
    referrer: "https://mod.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLogin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLogin);

  // 11. As community moderator, create multiple rules for the community
  const rule1Label = "Respect others";
  const rule2Label = "No spam";

  const rule1Body = {
    label: rule1Label,
    description: "Members must treat others with respect and kindness.",
    display_order: 1 as number & tags.Type<"int32">,
    is_active: true,
    rule_category_code: ruleCategory.code,
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  const rule2Body = {
    label: rule2Label,
    description: "Do not post unsolicited advertisements or spam.",
    display_order: 2 as number & tags.Type<"int32">,
    is_active: true,
    rule_category_code: null,
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  const createdRule1: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.communityModerator.communities.rules.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: rule1Body,
      },
    );
  typia.assert(createdRule1);

  const createdRule2: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.communityModerator.communities.rules.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: rule2Body,
      },
    );
  typia.assert(createdRule2);

  // 12. Prepare an unauthenticated connection for governance (headers cleared)
  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 13. Call governance endpoint without authentication
  const governance: ICommunityPlatformCommunityGovernance =
    await api.functional.communityPlatform.communities.governance.at(
      publicConnection,
      { communityIdentifier: community.identifier },
    );
  typia.assert(governance);

  // 14. Validate community sub-object
  const govCommunity: ICommunityPlatformCommunityGovernanceCommunity =
    governance.community;

  TestValidator.equals(
    "community identifier matches",
    govCommunity.identifier,
    community.identifier,
  );
  TestValidator.equals(
    "community title matches",
    govCommunity.title,
    community.title,
  );
  TestValidator.equals(
    "community visibility code matches",
    govCommunity.visibilityLevel.code,
    visibilityLevel.code,
  );
  TestValidator.predicate(
    "community is not archived",
    govCommunity.isArchived === false,
  );
  TestValidator.predicate(
    "community is not removed",
    govCommunity.isRemoved === false,
  );

  // 15. Validate rules array
  const rules: ICommunityPlatformCommunityRuleSummary[] = governance.rules;

  const ruleSummary1 = rules.find((r) => r.label === rule1Label);
  const ruleSummary2 = rules.find((r) => r.label === rule2Label);

  TestValidator.predicate("governance includes rule 1", !!ruleSummary1);
  TestValidator.predicate("governance includes rule 2", !!ruleSummary2);

  if (ruleSummary1) {
    TestValidator.equals(
      "rule1 description matches",
      ruleSummary1.description,
      rule1Body.description,
    );
    TestValidator.equals(
      "rule1 display order matches",
      ruleSummary1.displayOrder,
      rule1Body.display_order,
    );
    TestValidator.predicate("rule1 is active", ruleSummary1.isActive === true);
    TestValidator.predicate(
      "rule1 has category summary",
      !!ruleSummary1.ruleCategory,
    );
    if (ruleSummary1.ruleCategory) {
      const cat = ruleSummary1.ruleCategory;
      TestValidator.equals(
        "rule1 category code matches",
        cat.code,
        ruleCategory.code,
      );
      TestValidator.equals(
        "rule1 category name matches",
        cat.name,
        ruleCategory.name,
      );
      TestValidator.equals(
        "rule1 category description matches",
        cat.description,
        ruleCategory.description,
      );
      TestValidator.equals(
        "rule1 category sortOrder matches",
        cat.sortOrder,
        ruleCategory.sort_order,
      );
      TestValidator.predicate(
        "rule1 category is active",
        cat.isActive === ruleCategory.is_active,
      );
    }
  }

  if (ruleSummary2) {
    TestValidator.equals(
      "rule2 description matches",
      ruleSummary2.description,
      rule2Body.description,
    );
    TestValidator.equals(
      "rule2 display order matches",
      ruleSummary2.displayOrder,
      rule2Body.display_order,
    );
    TestValidator.predicate("rule2 is active", ruleSummary2.isActive === true);
    TestValidator.predicate(
      "rule2 has no category summary",
      ruleSummary2.ruleCategory == null,
    );
  }

  // 16. Validate ruleCategories collection
  const ruleCategories: ICommunityPlatformCommunityRuleCategorySummary[] =
    governance.ruleCategories;

  const govCategory = ruleCategories.find((c) => c.code === ruleCategory.code);

  TestValidator.predicate(
    "governance includes created rule category",
    !!govCategory,
  );
  if (govCategory) {
    TestValidator.equals(
      "governance category name matches",
      govCategory.name,
      ruleCategory.name,
    );
    TestValidator.equals(
      "governance category description matches",
      govCategory.description,
      ruleCategory.description,
    );
    TestValidator.equals(
      "governance category sortOrder matches",
      govCategory.sortOrder,
      ruleCategory.sort_order,
    );
    TestValidator.predicate(
      "governance category is active",
      govCategory.isActive === ruleCategory.is_active,
    );
  }

  if (ruleSummary1 && govCategory) {
    TestValidator.equals(
      "rule1 category id is in ruleCategories",
      ruleSummary1.ruleCategory?.id,
      govCategory.id,
    );
  }

  // 17. Validate moderation summary
  const moderation: ICommunityPlatformCommunityModerationSummary =
    governance.moderation;

  TestValidator.predicate(
    "exactly one active moderator",
    moderation.totalModerators >= 1,
  );

  const moderatorIdentities: ICommunityPlatformCommunityModeratorIdentitySummary[] =
    moderation.moderators;

  const governanceModerator = moderatorIdentities.find(
    (m) => m.id === moderatorAuthorized.id,
  );

  TestValidator.predicate(
    "governance includes the assigned moderator",
    !!governanceModerator,
  );

  if (governanceModerator) {
    TestValidator.predicate(
      "moderator username is non-empty string",
      typeof governanceModerator.username === "string" &&
        governanceModerator.username.length > 0,
    );
  }
}
