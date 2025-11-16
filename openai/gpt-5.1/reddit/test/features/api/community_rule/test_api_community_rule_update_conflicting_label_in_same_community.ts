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
 * Validate that updating a community rule's label to another rule's label
 * within the same community fails, enforcing (community_id, label) uniqueness
 * on update.
 *
 * Business flow:
 *
 * 1. Register and authenticate a platformAdmin.
 * 2. As platformAdmin, create a visibility level and a rule category.
 * 3. Register and authenticate a memberUser, then create a community referencing
 *    the visibility level.
 * 4. Register and authenticate a communityModerator.
 * 5. As communityModerator, create two rules (Rule A, Rule B) in the same
 *    community with different labels.
 * 6. Attempt to update Rule B's label to "Rule A" and assert the update call fails
 *    (some error), indicating uniqueness is enforced during updates.
 */
export async function test_api_community_rule_update_conflicting_label_in_same_community(
  connection: api.IConnection,
) {
  // 1. Register and login as platformAdmin
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: platformAdminEmail,
    password: "P@ssw0rd!",
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // Explicit login to exercise login flow and ensure Authorization header
  const platformAdminLoginBody = {
    identifier: platformAdminEmail,
    password: "P@ssw0rd!",
    href: "https://admin.console.example.com/login",
    referrer: "https://admin.console.example.com/landing",
    ip: "127.0.0.1",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminAfterLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminAfterLogin);

  // 2. Create a visibility level as platformAdmin
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(8)}`;

  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility",
    description: "Community is publicly visible and joinable.",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Create a rule category as platformAdmin
  const ruleCategoryCode = `behavior-${RandomGenerator.alphaNumeric(8)}`;

  const ruleCategoryCreateBody = {
    code: ruleCategoryCode,
    name: "Behavior Rules",
    description: "Rules governing member behavior.",
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

  // 4. Register and login as memberUser
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: memberEmail,
    password: "UserP@ssw0rd!",
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/home",
    ip: "127.0.0.1",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberLoginBody = {
    identifier: memberEmail,
    password: "UserP@ssw0rd!",
    href: "https://community.example.com/login",
    referrer: "https://community.example.com/home",
    ip: "127.0.0.1",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberAfterLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAfterLogin);

  // 5. Create a community as memberUser, referencing the visibility level code
  const communityIdentifier = `community-${RandomGenerator.alphaNumeric(8)}`;

  const communityCreateBody = {
    identifier: communityIdentifier,
    title: "Test Community for Rule Uniqueness",
    description: RandomGenerator.paragraph({ sentences: 5 }),
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

  // 6. Register and login as communityModerator
  const moderatorEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: moderatorEmail,
    password: "ModP@ssw0rd!",
    display_name: RandomGenerator.name(),
    href: "https://mod.console.example.com/register",
    referrer: "https://mod.console.example.com/landing",
    ip: "127.0.0.1",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  const moderatorLoginBody = {
    identifier: moderatorEmail,
    password: "ModP@ssw0rd!",
    href: "https://mod.console.example.com/login",
    referrer: "https://mod.console.example.com/landing",
    ip: "127.0.0.1",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorAfterLogin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorAfterLogin);

  // 7. As communityModerator, create Rule A in the community
  const ruleACreateBody = {
    label: "Rule A",
    description: RandomGenerator.paragraph({ sentences: 6 }),
    display_order: 1,
    is_active: true,
    rule_category_code: ruleCategory.code,
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  const ruleA: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.communityModerator.communities.rules.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: ruleACreateBody,
      },
    );
  typia.assert(ruleA);

  // 8. As communityModerator, create Rule B in the same community
  const ruleBCreateBody = {
    label: "Rule B",
    description: RandomGenerator.paragraph({ sentences: 6 }),
    display_order: 2,
    is_active: true,
    rule_category_code: ruleCategory.code,
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  const ruleB: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.communityModerator.communities.rules.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: ruleBCreateBody,
      },
    );
  typia.assert(ruleB);

  // 9. Attempt to update Rule B's label to conflict with Rule A's label
  const conflictingUpdateBody = {
    label: "Rule A",
  } satisfies ICommunityPlatformCommunityRule.IUpdate;

  await TestValidator.error(
    "updating rule label to an existing label in the same community must fail",
    async () => {
      await api.functional.communityPlatform.communityModerator.communities.rules.update(
        connection,
        {
          communityIdentifier: community.identifier,
          ruleId: ruleB.id,
          body: conflictingUpdateBody,
        },
      );
    },
  );
}
