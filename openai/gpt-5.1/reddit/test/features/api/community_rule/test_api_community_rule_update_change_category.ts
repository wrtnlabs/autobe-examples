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
 * Validate that a community moderator can change and clear the category
 * classification of an existing community rule.
 *
 * Business flow:
 *
 * 1. Platform admin joins and logs in, then creates a visibility level and two
 *    rule categories (behavior, safety).
 * 2. Member user joins and logs in, then creates a community using the created
 *    visibility level code.
 * 3. Community moderator joins and logs in.
 * 4. Moderator creates an initial rule in the community with rule_category_code =
 *    behavior.
 * 5. First update: change rule_category_code from behavior to safety and verify
 *    category change in response.
 * 6. Second update: set rule_category_code explicitly to null to clear association
 *    and verify rule_category_id and category are null while core fields
 *    remain.
 */
export async function test_api_community_rule_update_change_category(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin-console.local/join",
    referrer: "https://admin-console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 1-1. Platform admin login (to simulate realistic multi-auth flow)
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin-console.local/login",
    referrer: "https://admin-console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminAfterLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminAfterLogin);

  // 2. Platform admin creates a visibility level
  const visibilityCode = `vis_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Test Visibility",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);
  TestValidator.equals(
    "created visibility level code should match request",
    visibilityLevel.code,
    visibilityCreateBody.code,
  );

  // 3. Platform admin creates two rule categories: behavior and safety
  const behaviorCode = `behavior_${RandomGenerator.alphaNumeric(6)}`;
  const behaviorCategoryBody = {
    code: behaviorCode,
    name: "Behavior Rules",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    sort_order: 1 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies ICommunityPlatformCommunityRuleCategory.ICreate;

  const behaviorCategory: ICommunityPlatformCommunityRuleCategory =
    await api.functional.communityPlatform.platformAdmin.communityRuleCategories.create(
      connection,
      { body: behaviorCategoryBody },
    );
  typia.assert(behaviorCategory);

  const safetyCode = `safety_${RandomGenerator.alphaNumeric(6)}`;
  const safetyCategoryBody = {
    code: safetyCode,
    name: "Safety Rules",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    sort_order: 2 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies ICommunityPlatformCommunityRuleCategory.ICreate;

  const safetyCategory: ICommunityPlatformCommunityRuleCategory =
    await api.functional.communityPlatform.platformAdmin.communityRuleCategories.create(
      connection,
      { body: safetyCategoryBody },
    );
  typia.assert(safetyCategory);

  // 4. Member user joins and logs in
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://community.local/join",
    referrer: "https://community.local/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: "127.0.0.1",
    href: "https://community.local/login",
    referrer: "https://community.local/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberAfterLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAfterLogin);

  // 5. Member user creates a community using the created visibility level
  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
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
  TestValidator.equals(
    "community identifier must match request",
    community.identifier,
    communityCreateBody.identifier,
  );

  // 6. Community moderator joins and logs in
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://moderator.local/join",
    referrer: "https://moderator.local/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: "127.0.0.1",
    href: "https://moderator.local/login",
    referrer: "https://moderator.local/landing",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorAfterLogin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorAfterLogin);

  // 7. Moderator creates an initial rule with behavior category
  const initialRuleCreateBody = {
    label: "Be respectful",
    description: RandomGenerator.paragraph({ sentences: 8 }),
    display_order: 1 as number & tags.Type<"int32">,
    is_active: true,
    rule_category_code: behaviorCategory.code,
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  const initialRule: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.communityModerator.communities.rules.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: initialRuleCreateBody,
      },
    );
  typia.assert(initialRule);

  TestValidator.equals(
    "initial rule's label should match create request",
    initialRule.label,
    initialRuleCreateBody.label,
  );
  TestValidator.equals(
    "initial rule should be active",
    initialRule.is_active,
    initialRuleCreateBody.is_active,
  );
  TestValidator.equals(
    "initial rule should belong to created community",
    initialRule.community_id,
    community.id,
  );
  // Category expectation: category summary should exist and match behavior code
  if (initialRule.category !== null && initialRule.category !== undefined) {
    TestValidator.equals(
      "initial rule category code should be behavior",
      initialRule.category.code,
      behaviorCategory.code,
    );
  }

  const originalRuleId = initialRule.id;
  const originalLabel = initialRule.label;
  const originalDescription = initialRule.description;
  const originalDisplayOrder = initialRule.display_order;
  const originalCommunityId = initialRule.community_id;

  // 8. First update: change category from behavior to safety
  const firstUpdateBody = {
    rule_category_code: safetyCategory.code,
  } satisfies ICommunityPlatformCommunityRule.IUpdate;

  const updatedRuleWithSafety: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.communityModerator.communities.rules.update(
      connection,
      {
        communityIdentifier: community.identifier,
        ruleId: initialRule.id,
        body: firstUpdateBody,
      },
    );
  typia.assert(updatedRuleWithSafety);

  TestValidator.equals(
    "updated rule id should remain the same after category change",
    updatedRuleWithSafety.id,
    originalRuleId,
  );
  TestValidator.equals(
    "updated rule community_id should remain unchanged",
    updatedRuleWithSafety.community_id,
    originalCommunityId,
  );
  TestValidator.equals(
    "updated rule label should remain unchanged when only category is updated",
    updatedRuleWithSafety.label,
    originalLabel,
  );
  TestValidator.equals(
    "updated rule description should remain unchanged when only category is updated",
    updatedRuleWithSafety.description,
    originalDescription,
  );
  TestValidator.equals(
    "updated rule display_order should remain unchanged when only category is updated",
    updatedRuleWithSafety.display_order,
    originalDisplayOrder,
  );

  if (
    updatedRuleWithSafety.category !== null &&
    updatedRuleWithSafety.category !== undefined
  ) {
    TestValidator.equals(
      "rule category should now be safety",
      updatedRuleWithSafety.category.code,
      safetyCategory.code,
    );
  }
  TestValidator.predicate(
    "rule_category_id should be present when safety category is applied",
    updatedRuleWithSafety.rule_category_id !== null &&
      updatedRuleWithSafety.rule_category_id !== undefined,
  );

  const safetyCategoryIdAfterUpdate = updatedRuleWithSafety.rule_category_id;

  // 9. Second update: clear category by setting rule_category_code to null
  const secondUpdateBody = {
    rule_category_code: null,
  } satisfies ICommunityPlatformCommunityRule.IUpdate;

  const updatedRuleCleared: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.communityModerator.communities.rules.update(
      connection,
      {
        communityIdentifier: community.identifier,
        ruleId: originalRuleId,
        body: secondUpdateBody,
      },
    );
  typia.assert(updatedRuleCleared);

  // Core fields remain intact
  TestValidator.equals(
    "cleared rule should keep same id",
    updatedRuleCleared.id,
    originalRuleId,
  );
  TestValidator.equals(
    "cleared rule should keep same community_id",
    updatedRuleCleared.community_id,
    originalCommunityId,
  );
  TestValidator.equals(
    "cleared rule label should remain unchanged",
    updatedRuleCleared.label,
    originalLabel,
  );
  TestValidator.equals(
    "cleared rule description should remain unchanged",
    updatedRuleCleared.description,
    originalDescription,
  );
  TestValidator.equals(
    "cleared rule display_order should remain unchanged",
    updatedRuleCleared.display_order,
    originalDisplayOrder,
  );

  // Category association cleared
  TestValidator.equals(
    "rule_category_id should be null after clearing category",
    updatedRuleCleared.rule_category_id,
    null,
  );
  TestValidator.equals(
    "category summary should be null after clearing category",
    updatedRuleCleared.category,
    null,
  );

  // Ensure previous safety category id (if any) is different from now-null state
  if (
    safetyCategoryIdAfterUpdate !== null &&
    safetyCategoryIdAfterUpdate !== undefined
  ) {
    TestValidator.notEquals(
      "previous safety category foreign key should differ from cleared null state",
      safetyCategoryIdAfterUpdate,
      updatedRuleCleared.rule_category_id,
    );
  }
}
