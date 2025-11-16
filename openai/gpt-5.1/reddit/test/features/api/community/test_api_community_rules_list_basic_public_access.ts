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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityRule";

/**
 * Validate public listing of community rules with basic pagination and proper
 * community scoping.
 *
 * Business goal:
 *
 * - Ensure that community rules defined under a specific community can be listed
 *   via PATCH /communityPlatform/communities/{communityIdentifier}/rules using
 *   default search options, without requiring authentication, and that only
 *   rules of the targeted community are returned.
 *
 * End-to-end steps:
 *
 * 1. Platform admin registration and master data setup
 *
 *    - Register a platformAdmin actor via /auth/platformAdmin/join.
 *    - Optionally login once via /auth/platformAdmin/login (join already
 *         authenticates) to exercise login API.
 *    - Create a visibility level master via
 *         /communityPlatform/platformAdmin/communityVisibilityLevels
 *         (ICreate).
 *    - Create a community rule category via
 *         /communityPlatform/platformAdmin/communityRuleCategories (ICreate).
 * 2. Member user registration and community creation
 *
 *    - Register a memberUser via /auth/memberUser/join.
 *    - Create a community via /communityPlatform/memberUser/communities with:
 *
 *         - Identifier: unique slug (e.g., "rules-public-<random>").
 *         - Title/description.
 *         - VisibilityLevelCode: value from the visibility level created in step 1.
 *         - IsNsfw: false.
 *    - Capture the community.identifier as communityIdentifier for rules APIs.
 * 3. Community moderator registration and rule creation for first community
 *
 *    - Register a communityModerator via /auth/communityModerator/join.
 *    - Using communityModerator auth, create several rules for the first community
 *         via
 *         /communityPlatform/communityModerator/communities/{communityIdentifier}/rules
 *         with ICommunityPlatformCommunityRule.ICreate:
 *
 *         - Create at least three rules.
 *         - Vary display_order: 1, 2, 3.
 *         - Mix is_active flags: e.g., [true, true, false].
 *         - For at least one rule, set rule_category_code to the code of the rule
 *                   category created in step 1.
 *    - Collect returned ICommunityPlatformCommunityRule instances for later
 *         assertion.
 * 4. Create a second community and rules to validate cross-community isolation
 *
 *    - Switch back to memberUser using /auth/memberUser/login.
 *    - Create a second community with a distinct identifier (e.g.,
 *         "rules-other-<random>").
 *    - Switch back to communityModerator with /auth/communityModerator/login.
 *    - Create at least one rule in the second community.
 *    - This establishes data in a different community to ensure the listing endpoint
 *         scopes correctly.
 * 5. Public listing of rules for the first community
 *
 *    - Build an unauthenticated connection by cloning the original connection and
 *         assigning empty headers.
 *    - Call api.functional.communityPlatform.communities.rules.index with:
 *
 *         - CommunityIdentifier: identifier of the first community.
 *         - Body: { page: 1, limit: 20 } (ICommunityPlatformCommunityRule.IRequest, other
 *                   filters omitted).
 *    - This simulates a public (unauthenticated) read of community rules.
 * 6. Assertions
 *
 *    - Typia.assert on all non-void responses (admin join/login, visibility
 *         level/category, member join, community create, moderator join/login,
 *         rule creations, and listing response).
 *    - Validate pagination metadata from IPage.IPagination:
 *
 *         - Current === 1.
 *         - Limit >= number of created rules for the first community and > 0.
 *         - Records >= number of created rules for the first community.
 *         - Pages >= 1.
 *    - Validate scoping and content:
 *
 *         - Build a set of rule IDs created for the first community and for the second
 *                   community.
 *         - Verify that every rule ID in the listing response belongs to the first
 *                   community (no IDs from the second community).
 *         - For all _active_ rules in the first community, assert that their IDs are
 *                   present in the listing response.
 *         - For at least one summary item that has a category, check that its
 *                   category.id/code/name match the category created in step
 *                   1.
 *         - For each returned summary item, validate that:
 *
 *                           - Id is one of the created rule IDs for the first community.
 *                           - Title equals the label used on creation for that rule.
 *                           - Position equals the display_order used on creation.
 *                           - Is_active matches the stored rule's is_active.
 *                           - Category is defined iff the underlying rule was created with
 *                                               rule_category_code.
 * 7. Non-goals / constraints
 *
 *    - Do not test HTTP status codes explicitly; rely on successful responses or
 *         thrown errors.
 *    - Do not send invalid types or deliberately malformed DTOs.
 *    - Do not manipulate connection.headers on the original connection, only on a
 *         cloned unauthenticated connection.
 */
export async function test_api_community_rules_list_basic_public_access(
  connection: api.IConnection,
) {
  // 1. Platform admin registration and master data setup
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "P@ssw0rd!",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // Optional login to exercise login endpoint and ensure Authorization header is valid
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // Create a visibility level master record
  const visibilityCode = `public_${RandomGenerator.alphaNumeric(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Community",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);

  // Create a community rule category master record
  const ruleCategoryCode = `behavior_${RandomGenerator.alphaNumeric(6)}`;
  const ruleCategoryCreateBody = {
    code: ruleCategoryCode,
    name: "Behavior Rules",
    description: RandomGenerator.paragraph({ sentences: 6 }),
    sort_order: 1 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies ICommunityPlatformCommunityRuleCategory.ICreate;

  const ruleCategory: ICommunityPlatformCommunityRuleCategory =
    await api.functional.communityPlatform.platformAdmin.communityRuleCategories.create(
      connection,
      { body: ruleCategoryCreateBody },
    );
  typia.assert(ruleCategory);

  // 2. Member user registration and community creation
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@member.example.com` as string &
      tags.Format<"email">,
    password: "MemberP@ss1",
    ip: "127.0.0.1",
    href: "https://app.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://app.example.com/" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const communityIdentifier1 = `rules-public-${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody1 = {
    identifier: communityIdentifier1,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    // primaryTagIds omitted on purpose (optional)
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community1: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody1 },
    );
  typia.assert(community1);

  // 3. Community moderator registration and rule creation for first community
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@moderator.example.com` as string &
      tags.Format<"email">,
    password: "ModeratorP@ss1",
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://mod.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://mod.example.com/" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // Create several rules in the first community as communityModerator
  const createdRulesCommunity1: ICommunityPlatformCommunityRule[] = [];
  const ruleDefinitions = [
    {
      label: "Be respectful",
      is_active: true,
      categoryCode: ruleCategoryCode,
      displayOrder: 1,
    },
    {
      label: "No spam",
      is_active: true,
      categoryCode: undefined,
      displayOrder: 2,
    },
    {
      label: "Off-topic posts may be removed",
      is_active: false,
      categoryCode: undefined,
      displayOrder: 3,
    },
  ] as const;

  for (const def of ruleDefinitions) {
    const ruleCreateBody = {
      label: def.label,
      description: RandomGenerator.paragraph({ sentences: 8 }),
      display_order: def.displayOrder as number & tags.Type<"int32">,
      is_active: def.is_active,
      rule_category_code: def.categoryCode ?? null,
    } satisfies ICommunityPlatformCommunityRule.ICreate;

    const createdRule: ICommunityPlatformCommunityRule =
      await api.functional.communityPlatform.communityModerator.communities.rules.create(
        connection,
        {
          communityIdentifier: communityIdentifier1,
          body: ruleCreateBody,
        },
      );
    typia.assert(createdRule);
    createdRulesCommunity1.push(createdRule);
  }

  // 4. Create a second community and rule(s) for cross-community isolation
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: "127.0.0.1",
    href: "https://app.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://app.example.com/" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoggedIn: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoggedIn);

  const communityIdentifier2 = `rules-other-${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody2 = {
    identifier: communityIdentifier2,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community2: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody2 },
    );
  typia.assert(community2);

  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: "127.0.0.1",
    href: "https://mod.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://mod.example.com/" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoggedIn: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLoggedIn);

  const otherRuleCreateBody = {
    label: "Other community rule",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    display_order: 1 as number & tags.Type<"int32">,
    is_active: true,
    rule_category_code: null,
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  const createdRuleCommunity2: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.communityModerator.communities.rules.create(
      connection,
      {
        communityIdentifier: communityIdentifier2,
        body: otherRuleCreateBody,
      },
    );
  typia.assert(createdRuleCommunity2);

  // 5. Public listing of rules for the first community (unauthenticated)
  const publicConnection: api.IConnection = { ...connection, headers: {} };

  const requestBody: ICommunityPlatformCommunityRule.IRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
  };

  const pageResult: IPageICommunityPlatformCommunityRule.ISummary =
    await api.functional.communityPlatform.communities.rules.index(
      publicConnection,
      {
        communityIdentifier: communityIdentifier1,
        body: requestBody,
      },
    );
  typia.assert(pageResult);

  const pagination: IPage.IPagination = pageResult.pagination;
  typia.assert(pagination);

  // 6. Assertions on pagination metadata
  TestValidator.equals(
    "current page should be 1",
    pagination.current,
    1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );

  TestValidator.predicate("limit should be positive", pagination.limit > 0);

  TestValidator.predicate(
    "records should be at least created rules for first community",
    pagination.records >=
      (createdRulesCommunity1.length as number &
        tags.Type<"int32"> &
        tags.Minimum<0>),
  );

  TestValidator.predicate(
    "pages should be at least 1 when there are records",
    pagination.records === 0 || pagination.pages >= 1,
  );

  // Build id sets for validation
  const community1RuleIds = createdRulesCommunity1.map((r) => r.id);
  const community2RuleId = createdRuleCommunity2.id;

  const responseRuleIds = pageResult.data.map((s) => s.id);

  // Ensure no rules from the second community appear in the listing
  TestValidator.predicate(
    "no rules from second community should be in listing",
    responseRuleIds.every((id) => id !== community2RuleId),
  );

  // Ensure all active rules from first community appear in listing
  const activeRulesCommunity1 = createdRulesCommunity1.filter(
    (r) => r.is_active,
  );
  for (const activeRule of activeRulesCommunity1) {
    TestValidator.predicate(
      `active rule ${activeRule.id} should be listed`,
      responseRuleIds.includes(activeRule.id),
    );
  }

  // Map rule id -> source rule for field-level comparisons
  const ruleById = new Map<string, ICommunityPlatformCommunityRule>();
  for (const rule of createdRulesCommunity1) {
    ruleById.set(rule.id, rule);
  }

  // Validate summary fields for each returned rule
  for (const summary of pageResult.data) {
    const sourceRule = ruleById.get(summary.id);

    TestValidator.predicate(
      "summary rule id should belong to first community",
      sourceRule !== undefined,
    );

    if (!sourceRule) continue;

    TestValidator.equals(
      "summary title should equal rule label",
      summary.title,
      sourceRule.label,
    );

    TestValidator.predicate(
      "summary summary text should not be empty",
      summary.summary.length > 0,
    );

    TestValidator.equals(
      "summary position should equal rule display_order",
      summary.position,
      sourceRule.display_order,
    );

    TestValidator.equals(
      "summary is_active should match rule is_active",
      summary.is_active,
      sourceRule.is_active,
    );

    if (sourceRule.rule_category_id) {
      TestValidator.predicate(
        "summary category should be defined when rule has category",
        summary.category !== undefined,
      );

      if (summary.category) {
        TestValidator.equals(
          "summary category id should equal created category id",
          summary.category.id,
          ruleCategory.id,
        );

        TestValidator.equals(
          "summary category code should equal created category code",
          summary.category.code,
          ruleCategory.code,
        );

        TestValidator.equals(
          "summary category name should equal created category name",
          summary.category.name,
          ruleCategory.name,
        );
      }
    } else {
      TestValidator.predicate(
        "summary category may be undefined when rule has no category",
        summary.category === undefined,
      );
    }
  }
}
