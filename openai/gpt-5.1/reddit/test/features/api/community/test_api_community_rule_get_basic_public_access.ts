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
 * Verify public retrieval of a specific community rule by communityIdentifier
 * and ruleId.
 *
 * Business workflow:
 *
 * 1. Register a platformAdmin and implicitly authenticate via join.
 * 2. As platformAdmin, create a community visibility level and a rule category.
 * 3. Register a memberUser and implicitly authenticate as that actor.
 * 4. As memberUser, create a community using the created visibility level code.
 * 5. Register a communityModerator and implicitly authenticate as that actor.
 * 6. As communityModerator, create a community rule under the created community
 *    using the created rule category code.
 * 7. Build a fresh unauthenticated connection and call the public GET rule
 *    endpoint.
 * 8. Assert that the returned rule matches the created rule and is fully detailed
 *    for an active, non-deleted rule.
 */
export async function test_api_community_rule_get_basic_public_access(
  connection: api.IConnection,
) {
  // 1. Register platform admin (join implicitly authenticates as platformAdmin)
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.mobile(),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create a community visibility level as platformAdmin
  const visibilityCode = `public-${RandomGenerator.alphabets(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Community Visibility",
    description:
      "Communities using this visibility are readable and discoverable by anyone.",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Create a community rule category as platformAdmin
  const ruleCategoryCode = `behavior-${RandomGenerator.alphabets(6)}`;
  const ruleCategoryCreateBody = {
    code: ruleCategoryCode,
    name: "Behavior Rules",
    description:
      "Rules that govern expected member behavior, tone, and interactions within the community.",
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

  // 4. Register member user and implicitly authenticate as memberUser
  const memberUsername = RandomGenerator.alphabets(10);
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberJoinBody = {
    username: memberUsername,
    email: memberEmail,
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 5. Create a community as memberUser using the previously created visibility level code
  const communityIdentifier = `community-${RandomGenerator.alphabets(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityLevel.code,
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
    "community identifier should match creation input",
    community.identifier,
    communityCreateBody.identifier,
  );
  TestValidator.equals(
    "community visibility level code should match creation input",
    community.visibilityLevel.code,
    visibilityLevel.code,
  );

  // 6. Register community moderator and implicitly authenticate
  const moderatorUsername = RandomGenerator.alphabets(10);
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorJoinBody = {
    username: moderatorUsername,
    email: moderatorEmail,
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://community.example.com/moderator/join",
    referrer: "https://community.example.com/",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 7. Create a community rule under the created community as communityModerator
  const ruleLabel = "Be respectful";
  const ruleDescription = RandomGenerator.paragraph({
    sentences: 12,
    wordMin: 4,
    wordMax: 10,
  });

  const ruleCreateBody = {
    label: ruleLabel,
    description: ruleDescription,
    display_order: 10,
    is_active: true,
    rule_category_code: ruleCategory.code,
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  const createdRule: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.communityModerator.communities.rules.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: ruleCreateBody,
      },
    );
  typia.assert(createdRule);

  TestValidator.equals(
    "created rule community_id should match community id",
    createdRule.community_id,
    community.id,
  );
  TestValidator.equals(
    "created rule label should match input",
    createdRule.label,
    ruleCreateBody.label,
  );
  TestValidator.equals(
    "created rule description should match input",
    createdRule.description,
    ruleCreateBody.description,
  );
  TestValidator.equals(
    "created rule display_order should match input",
    createdRule.display_order,
    ruleCreateBody.display_order,
  );
  TestValidator.equals(
    "created rule is_active should match input",
    createdRule.is_active,
    ruleCreateBody.is_active,
  );

  // Category summary may be null if the backend chooses not to embed it,
  // but according to DTO it is expected when rule_category_code is provided.
  if (createdRule.category !== null && createdRule.category !== undefined) {
    TestValidator.equals(
      "created rule category id should match ruleCategory id",
      createdRule.category.id,
      ruleCategory.id,
    );
    TestValidator.equals(
      "created rule category code should match ruleCategory code",
      createdRule.category.code,
      ruleCategory.code,
    );
  }

  // deleted_at should be null for a newly-created active rule
  TestValidator.equals(
    "created rule deleted_at should be null for active rule",
    createdRule.deleted_at ?? null,
    null,
  );

  // 8. Build an unauthenticated connection (no Authorization header)
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 9. Publicly retrieve the rule via GET /communityPlatform/communities/{communityIdentifier}/rules/{ruleId}
  const fetchedRule: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.communities.rules.at(
      unauthConnection,
      {
        communityIdentifier: community.identifier,
        ruleId: createdRule.id,
      },
    );
  typia.assert(fetchedRule);

  // 10. Validate identity and ownership
  TestValidator.equals(
    "fetched rule id should equal created rule id",
    fetchedRule.id,
    createdRule.id,
  );
  TestValidator.equals(
    "fetched rule community_id should equal community id",
    fetchedRule.community_id,
    community.id,
  );

  // 11. Validate core rule attributes
  TestValidator.equals(
    "fetched rule label should equal creation label",
    fetchedRule.label,
    ruleCreateBody.label,
  );
  TestValidator.equals(
    "fetched rule description should equal creation description",
    fetchedRule.description,
    ruleCreateBody.description,
  );
  TestValidator.equals(
    "fetched rule display_order should equal creation display_order",
    fetchedRule.display_order,
    ruleCreateBody.display_order,
  );
  TestValidator.equals(
    "fetched rule is_active should be true",
    fetchedRule.is_active,
    true,
  );

  // 12. Validate category summary when present
  if (fetchedRule.category !== null && fetchedRule.category !== undefined) {
    TestValidator.equals(
      "fetched rule category id should equal created category id",
      fetchedRule.category.id,
      ruleCategory.id,
    );
    TestValidator.equals(
      "fetched rule category code should equal created category code",
      fetchedRule.category.code,
      ruleCategory.code,
    );
    TestValidator.equals(
      "fetched rule category name should equal created category name",
      fetchedRule.category.name,
      ruleCategory.name,
    );
    TestValidator.equals(
      "fetched rule category description should equal created category description",
      fetchedRule.category.description,
      ruleCategory.description,
    );
    TestValidator.equals(
      "fetched rule category sort_order should equal created category sort_order",
      fetchedRule.category.sort_order,
      ruleCategory.sort_order,
    );
    TestValidator.equals(
      "fetched rule category is_active should equal created category is_active",
      fetchedRule.category.is_active,
      ruleCategory.is_active,
    );
  }

  // 13. Validate lifecycle timestamps and deletion state
  TestValidator.predicate(
    "fetched rule created_at should be a non-empty string",
    fetchedRule.created_at.length > 0,
  );
  TestValidator.predicate(
    "fetched rule updated_at should be a non-empty string",
    fetchedRule.updated_at.length > 0,
  );

  TestValidator.equals(
    "fetched rule deleted_at should be null for active rule",
    fetchedRule.deleted_at ?? null,
    null,
  );

  // 14. Optionally validate that immutable fields match between creation and fetch
  TestValidator.equals(
    "fetched rule immutable core fields should match created rule",
    {
      id: fetchedRule.id,
      community_id: fetchedRule.community_id,
      label: fetchedRule.label,
      description: fetchedRule.description,
      display_order: fetchedRule.display_order,
      is_active: fetchedRule.is_active,
      rule_category_id: fetchedRule.rule_category_id ?? null,
    },
    {
      id: createdRule.id,
      community_id: createdRule.community_id,
      label: createdRule.label,
      description: createdRule.description,
      display_order: createdRule.display_order,
      is_active: createdRule.is_active,
      rule_category_id: createdRule.rule_category_id ?? null,
    },
  );
}
