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
 * Validate lifecycle-sensitive retrieval of community rules via public GET
 * endpoint.
 *
 * This E2E test builds a realistic multi-actor workflow for the community
 * platform and verifies that GET
 * /communityPlatform/communities/{communityIdentifier}/rules/{ruleId} exposes
 * correct rule lifecycle information, particularly activity and soft-deletion
 * semantics, for rules defined under a community.
 *
 * Business story and steps:
 *
 * 1. A platform administrator configures master data required for communities and
 *    rules:
 *
 *    - Registers as a platformAdmin (which authenticates the SDK connection as this
 *         actor).
 *    - Creates a community visibility level master record.
 *    - Creates a community rule category master record.
 * 2. A member user joins and creates a community using the configured visibility
 *    level.
 * 3. A community moderator joins and, under this community, defines two rules:
 *
 *    - An active rule (is_active: true) that represents a normal, visible governance
 *         rule.
 *    - A rule created as inactive (is_active: false) that stands in for an
 *         non-active rule for the purposes of lifecycle inspection. Because the
 *         provided SDK list does not include update/delete endpoints for rules,
 *         we simulate a non-active lifecycle state via is_active at creation
 *         time rather than manipulating deleted_at.
 * 4. The test then calls GET
 *    /communityPlatform/communities/{communityIdentifier}/rules/{ruleId} for
 *    the active rule and verifies:
 *
 *    - The response is a valid ICommunityPlatformCommunityRule.
 *    - The rule id matches the created active rule.
 *    - The rule is_active flag is true.
 *    - The rule deleted_at field is null/undefined, i.e., not soft-deleted.
 * 5. The test also calls the same GET endpoint for the inactive rule id and
 *    verifies that:
 *
 *    - The response is a valid ICommunityPlatformCommunityRule.
 *    - The rule id matches the created inactive rule.
 *    - The rule is_active flag is false, confirming that lifecycle state is
 *         faithfully exposed by the public GET endpoint.
 *
 * The test focuses purely on business logic and lifecycle behavior. All request
 * bodies strictly satisfy their DTO types; no type-mismatch or schema-level
 * error scenarios are constructed.
 */
export async function test_api_community_rule_get_respects_soft_deletion_and_activity(
  connection: api.IConnection,
) {
  // 1. Platform admin: join and create visibility level + rule category
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const platformAdminJoin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: RandomGenerator.alphabets(12),
        email: platformAdminEmail,
        password: "P@ssw0rd!",
        displayName: RandomGenerator.name(),
        ip: "127.0.0.1",
        href: "https://admin.example.com/register",
        referrer: "https://admin.example.com/",
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert(platformAdminJoin);

  const visibilityCode = `vis_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: visibilityCode,
          name: "Public Visibility",
          description: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(visibilityLevel);

  const ruleCategoryCode = `cat_${RandomGenerator.alphaNumeric(8)}`;
  const ruleCategory: ICommunityPlatformCommunityRuleCategory =
    await api.functional.communityPlatform.platformAdmin.communityRuleCategories.create(
      connection,
      {
        body: {
          code: ruleCategoryCode,
          name: "Behavior Rules",
          description: RandomGenerator.paragraph({ sentences: 5 }),
          sort_order: 1 as number & tags.Type<"int32">,
          is_active: true,
        } satisfies ICommunityPlatformCommunityRuleCategory.ICreate,
      },
    );
  typia.assert(ruleCategory);

  // 2. Member user: join and create a community using the visibility level
  const memberUserEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const memberJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: memberUserEmail,
        password: "MemberP@ss1",
        ip: "127.0.0.1",
        href: "https://app.example.com/join",
        referrer: "https://app.example.com/",
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(memberJoin);

  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(6)}`;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: communityIdentifier,
          title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 6 }),
          visibilityLevelCode: visibilityCode,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Community moderator: join and create two rules under the community
  const moderatorEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const moderatorJoin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: moderatorEmail,
        password: "ModeratorP@ss1",
        display_name: RandomGenerator.name(),
        ip: "127.0.0.1",
        href: "https://mod.example.com/join",
        referrer: "https://mod.example.com/",
      } satisfies ICommunityPlatformCommunityModerator.IJoin,
    });
  typia.assert(moderatorJoin);

  const activeRule: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.communityModerator.communities.rules.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: {
          label: "Be respectful",
          description: RandomGenerator.paragraph({ sentences: 8 }),
          display_order: 1 as number & tags.Type<"int32">,
          is_active: true,
          rule_category_code: ruleCategoryCode,
        } satisfies ICommunityPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(activeRule);

  const inactiveRule: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.communityModerator.communities.rules.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: {
          label: "Inactive rule placeholder",
          description: RandomGenerator.paragraph({ sentences: 5 }),
          display_order: 2 as number & tags.Type<"int32">,
          is_active: false,
          rule_category_code: ruleCategoryCode,
        } satisfies ICommunityPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(inactiveRule);

  // 4. Retrieve active rule via public endpoint and validate details
  const fetchedActiveRule: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.communities.rules.at(connection, {
      communityIdentifier: community.identifier,
      ruleId: activeRule.id,
    });
  typia.assert(fetchedActiveRule);

  TestValidator.equals(
    "active rule id should match",
    fetchedActiveRule.id,
    activeRule.id,
  );
  TestValidator.predicate(
    "active rule should be marked as active",
    fetchedActiveRule.is_active === true,
  );
  TestValidator.predicate(
    "active rule should not be soft-deleted",
    fetchedActiveRule.deleted_at === null ||
      fetchedActiveRule.deleted_at === undefined,
  );

  // 5. Retrieve inactive rule and validate lifecycle state is exposed
  const fetchedInactiveRule: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.communities.rules.at(connection, {
      communityIdentifier: community.identifier,
      ruleId: inactiveRule.id,
    });
  typia.assert(fetchedInactiveRule);

  TestValidator.equals(
    "inactive rule id should match",
    fetchedInactiveRule.id,
    inactiveRule.id,
  );
  TestValidator.predicate(
    "inactive rule should be marked as inactive",
    fetchedInactiveRule.is_active === false,
  );
}
