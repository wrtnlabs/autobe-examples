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
 * Validate that a community moderator can create an active, categorized rule
 * for an existing community.
 *
 * Business workflow:
 *
 * 1. Platform admin joins and creates a visibility level to be used by
 *    communities.
 * 2. Member user joins and creates a community with that visibility level.
 * 3. Community moderator joins.
 * 4. Platform admin creates a global community rule category.
 * 5. Community moderator creates a rule under the community, referencing the
 *    category code.
 * 6. Validate the created rule matches the request payload and is associated with
 *    the expected category and has proper lifecycle fields.
 */
export async function test_api_community_rule_creation_with_category_by_moderator(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const platformAdminJoinHref = "https://admin.join.example.com/";
  const platformAdminJoinReferrer = "https://landing.example.com/";

  const platformAdminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const platformAdminUsername = `admin_${RandomGenerator.alphaNumeric(8)}`;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: platformAdminUsername,
        email: platformAdminEmail,
        password: "P@ssw0rd!",
        displayName: RandomGenerator.name(),
        ip: "127.0.0.1",
        href: platformAdminJoinHref as string & tags.Format<"uri">,
        referrer: platformAdminJoinReferrer as string & tags.Format<"uri">,
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Platform admin creates visibility level
  const visibilityCodeBase = "public-visible";
  const visibilityCode = `${visibilityCodeBase}-${RandomGenerator.alphaNumeric(6)}`;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: visibilityCode,
          name: "Public Visible Community",
          description: "Communities visible to all users and guests.",
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Member user joins
  const memberJoinHref = "https://member.join.example.com/";
  const memberJoinReferrer = "https://member.landing.example.com/";

  const memberEmail =
    `member_${RandomGenerator.alphaNumeric(8)}@example.com` as string &
      tags.Format<"email">;
  const memberUsername = `member_${RandomGenerator.alphaNumeric(8)}`;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: "P@ssw0rd!",
        ip: "127.0.0.2",
        href: memberJoinHref as string & tags.Format<"uri">,
        referrer: memberJoinReferrer as string & tags.Format<"uri">,
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(memberAuthorized);

  // 4. Member user creates a community using the visibility level code
  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(8)}`;
  const communityTitle = RandomGenerator.name(3);

  const communityCreateBody = {
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
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  TestValidator.equals(
    "community identifier should match creation payload",
    community.identifier,
    communityCreateBody.identifier,
  );

  // 5. Community moderator joins
  const moderatorJoinHref = "https://moderator.join.example.com/";
  const moderatorJoinReferrer = "https://moderator.landing.example.com/";

  const moderatorEmail =
    `moderator_${RandomGenerator.alphaNumeric(8)}@example.com` as string &
      tags.Format<"email">;
  const moderatorUsername = `moderator_${RandomGenerator.alphaNumeric(8)}`;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        username: moderatorUsername,
        email: moderatorEmail,
        password: "P@ssw0rd!",
        display_name: RandomGenerator.name(),
        ip: "127.0.0.3",
        href: moderatorJoinHref as string & tags.Format<"uri">,
        referrer: moderatorJoinReferrer as string & tags.Format<"uri">,
      } satisfies ICommunityPlatformCommunityModerator.IJoin,
    });
  typia.assert(moderatorAuthorized);

  // 6. Switch back to platform admin and create a community rule category
  const platformAdminLoginHref = "https://admin.login.example.com/";
  const platformAdminLoginReferrer = "https://admin.portal.example.com/";

  const platformAdminLoginResult: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: {
        identifier: platformAdminEmail,
        password: "P@ssw0rd!",
        ip: "127.0.0.4",
        href: platformAdminLoginHref as string & tags.Format<"uri">,
        referrer: platformAdminLoginReferrer as string & tags.Format<"uri">,
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    });
  typia.assert(platformAdminLoginResult);

  const categoryCodeBase = "behavior-guidelines";
  const categoryCode = `${categoryCodeBase}-${RandomGenerator.alphaNumeric(6)}`;

  const categoryCreateBody = {
    code: categoryCode,
    name: "Behavior Guidelines",
    description: "Rules that govern member behavior and conduct.",
    sort_order: 1 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies ICommunityPlatformCommunityRuleCategory.ICreate;

  const category: ICommunityPlatformCommunityRuleCategory =
    await api.functional.communityPlatform.platformAdmin.communityRuleCategories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(category);

  TestValidator.equals(
    "rule category code should match creation payload",
    category.code,
    categoryCreateBody.code,
  );

  // 7. Login as community moderator to create rule
  const moderatorLoginHref = "https://moderator.login.example.com/";
  const moderatorLoginReferrer = "https://moderator.portal.example.com/";

  const moderatorLoginResult: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: {
        identifier: moderatorEmail,
        password: "P@ssw0rd!",
        ip: "127.0.0.5",
        href: moderatorLoginHref as string & tags.Format<"uri">,
        referrer: moderatorLoginReferrer as string & tags.Format<"uri">,
      } satisfies ICommunityPlatformCommunityModerator.ILogin,
    });
  typia.assert(moderatorLoginResult);

  // 8. Moderator creates a community rule with category
  const ruleLabel = `rule_${community.identifier}_${RandomGenerator.alphaNumeric(6)}`;
  const ruleDescription = RandomGenerator.paragraph({ sentences: 10 });
  const ruleDisplayOrder = 1 as number & tags.Type<"int32">;

  const ruleCreateBody = {
    label: ruleLabel,
    description: ruleDescription,
    display_order: ruleDisplayOrder,
    is_active: true,
    rule_category_code: category.code,
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

  // 9. Business semantic assertions
  TestValidator.equals(
    "rule label should match request body",
    rule.label,
    ruleCreateBody.label,
  );

  TestValidator.equals(
    "rule description should match request body",
    rule.description,
    ruleCreateBody.description,
  );

  TestValidator.equals(
    "rule display_order should match request body",
    rule.display_order,
    ruleCreateBody.display_order,
  );

  TestValidator.equals(
    "rule is_active should match request body",
    rule.is_active,
    ruleCreateBody.is_active,
  );

  TestValidator.predicate(
    "rule_category_id should be non-null when rule_category_code is provided",
    rule.rule_category_id !== null && rule.rule_category_id !== undefined,
  );

  TestValidator.predicate(
    "rule category summary should be present",
    rule.category !== null && rule.category !== undefined,
  );

  if (rule.category !== null && rule.category !== undefined) {
    TestValidator.equals(
      "rule.category.code should match category.code",
      rule.category.code,
      category.code,
    );

    TestValidator.equals(
      "rule.category.id should match category.id",
      rule.category.id,
      category.id,
    );
  }

  TestValidator.predicate(
    "rule.created_at should be defined",
    rule.created_at !== null && rule.created_at !== undefined,
  );

  TestValidator.predicate(
    "rule.updated_at should be defined",
    rule.updated_at !== null && rule.updated_at !== undefined,
  );

  TestValidator.predicate(
    "rule.deleted_at should be null",
    rule.deleted_at === null || rule.deleted_at === undefined,
  );
}
