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
 * Verify that community rule retrieval is scoped to the owning community.
 *
 * Business goal:
 *
 * - Ensure that a rule created under Community A cannot be retrieved by using
 *   Community B's identifier with the same ruleId, and that such a cross-
 *   community access attempt results in an error instead of leaking rule data.
 * - Confirm that the same rule remains retrievable when using its correct owning
 *   community identifier.
 *
 * Workflow:
 *
 * 1. As platformAdmin, join and create a shared community visibility level and a
 *    rule category that will be used by both communities and the rule.
 * 2. As memberUser A, join and create Community A using the visibility level.
 * 3. As memberUser B, join and create Community B using the same visibility level
 *    but a different identifier.
 * 4. As communityModerator, join and create a rule under Community A, capturing
 *    its ruleId.
 * 5. Call GET /communityPlatform/communities/{communityIdentifier}/rules/{ruleId}
 *    using Community B's identifier with the ruleId belonging to Community A
 *    and assert that an error is thrown (no rule is leaked across
 *    communities).
 * 6. Call the same GET endpoint with Community A's identifier and the same ruleId,
 *    and assert that the rule is successfully returned and its id matches the
 *    created rule.
 */
export async function test_api_community_rule_get_not_found_for_wrong_community(
  connection: api.IConnection,
) {
  // 1. Platform admin joins and creates shared visibility level and rule category.
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const platformAdminJoin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: RandomGenerator.name(1),
        email: platformAdminEmail,
        password: "P@ssw0rd!",
        displayName: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert(platformAdminJoin);

  const visibilityCode = `public_${RandomGenerator.alphaNumeric(8)}`;
  const visibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: visibilityCode,
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(visibility);

  const ruleCategoryCode = `general_${RandomGenerator.alphaNumeric(8)}`;
  const ruleCategory: ICommunityPlatformCommunityRuleCategory =
    await api.functional.communityPlatform.platformAdmin.communityRuleCategories.create(
      connection,
      {
        body: {
          code: ruleCategoryCode,
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph(),
          sort_order: typia.random<number & tags.Type<"int32">>(),
          is_active: true,
        } satisfies ICommunityPlatformCommunityRuleCategory.ICreate,
      },
    );
  typia.assert(ruleCategory);

  // 2. MemberUser A joins and creates Community A.
  const memberAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberAJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: RandomGenerator.name(1),
        email: memberAEmail,
        password: "P@ssw0rd!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(memberAJoin);

  const communityAIdentifier = `community_${RandomGenerator.alphaNumeric(8)}`;
  const communityA: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: communityAIdentifier,
          title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph(),
          visibilityLevelCode: visibilityCode,
          isNsfw: false,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityA);

  // 3. MemberUser B joins and creates Community B.
  const memberBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberBJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: RandomGenerator.name(1),
        email: memberBEmail,
        password: "P@ssw0rd!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(memberBJoin);

  const communityBIdentifier = `community_${RandomGenerator.alphaNumeric(8)}`;
  const communityB: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: communityBIdentifier,
          title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph(),
          visibilityLevelCode: visibilityCode,
          isNsfw: false,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityB);

  // 4. Community moderator joins and creates a rule under Community A.
  const moderatorEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const moderatorJoin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        username: RandomGenerator.name(1),
        email: moderatorEmail,
        password: "P@ssw0rd!",
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformCommunityModerator.IJoin,
    });
  typia.assert(moderatorJoin);

  const ruleA: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.communityModerator.communities.rules.create(
      connection,
      {
        communityIdentifier: communityA.identifier,
        body: {
          label: RandomGenerator.name(2),
          description: RandomGenerator.paragraph(),
          display_order: typia.random<number & tags.Type<"int32">>(),
          is_active: true,
          rule_category_code: ruleCategoryCode,
        } satisfies ICommunityPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(ruleA);

  // 5. Negative: attempt to GET ruleA via Community B identifier and expect error.
  await TestValidator.error(
    "getting rule with wrong community identifier should fail",
    async () => {
      await api.functional.communityPlatform.communities.rules.at(connection, {
        communityIdentifier: communityB.identifier,
        ruleId: ruleA.id,
      });
    },
  );

  // 6. Control: GET ruleA via its owning community identifier should succeed.
  const fetchedRule: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.communities.rules.at(connection, {
      communityIdentifier: communityA.identifier,
      ruleId: ruleA.id,
    });
  typia.assert(fetchedRule);

  TestValidator.equals(
    "fetched rule id should equal created rule id",
    fetchedRule.id,
    ruleA.id,
  );
}
