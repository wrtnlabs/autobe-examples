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
 * Validate that a community cannot have two rules with the same label.
 *
 * Business context:
 *
 * - A community’s structured rules are stored in
 *   community_platform_community_rules.
 * - The database enforces a unique (community_id, label) constraint so that
 *   within a given community, each rule label is unique.
 * - Community moderators manage rules via the communityModerator actor endpoints,
 *   while platformAdmin manages master data such as visibility levels and rule
 *   categories, and memberUser creates communities.
 *
 * This test ensures:
 *
 * 1. A moderator can successfully create a first rule with a given label under a
 *    specific community.
 * 2. A second attempt to create another rule in the same community using the same
 *    label fails with a business error (backed by the DB unique index), even if
 *    other fields like description or category differ.
 *
 * High-level steps:
 *
 * 1. Create the three actors needed for the scenario:
 *
 *    - MemberUser (who will create the community)
 *    - PlatformAdmin (who will create visibility levels and rule categories)
 *    - CommunityModerator (who will create the rules)
 * 2. As platformAdmin, create a community visibility level to be referenced by the
 *    community.
 * 3. As memberUser, create a community using that visibility level code.
 * 4. As platformAdmin, create a community rule category with a unique code.
 * 5. As communityModerator, create a first community rule under the community with
 *    a fixed label (e.g., "no-spam").
 * 6. As communityModerator again, attempt to create a second community rule under
 *    the same community with the same label but otherwise valid data.
 * 7. Assert that the second creation fails using TestValidator.error, confirming
 *    that the uniqueness constraint is enforced.
 */
export async function test_api_community_rule_creation_conflicting_label_in_same_community(
  connection: api.IConnection,
) {
  // 1. Setup memberUser actor (join + login).
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "password-member",
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberJoin = await api.functional.auth.memberUser.join(connection, {
    body: memberJoinBody,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberJoin);

  const memberLogin = await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberJoinBody.email,
      password: memberJoinBody.password,
      ip: null,
      href: "https://member.example.com/login",
      referrer: "https://member.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberLogin);

  // 2. Setup platformAdmin actor and create visibility level + rule category.
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "password-admin",
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminJoin = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: platformAdminJoinBody,
    },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdminJoin);

  const platformAdminLogin = await api.functional.auth.platformAdmin.login(
    connection,
    {
      body: {
        identifier: platformAdminJoinBody.email,
        password: platformAdminJoinBody.password,
        ip: "127.0.0.1",
        href: "https://admin.example.com/login",
        referrer: "https://admin.example.com/landing",
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdminLogin);

  // 2-1. Create a visibility level used by the community.
  const visibilityCode = `visibility_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);
  TestValidator.equals(
    "created visibility code must match request",
    visibilityLevel.code,
    visibilityCreateBody.code,
  );

  // 2-2. Create a community rule category referenced by rules.
  const ruleCategoryCode = `rule_cat_${RandomGenerator.alphaNumeric(8)}`;
  const ruleCategoryCreateBody = {
    code: ruleCategoryCode,
    name: "Spam & Advertising",
    description: RandomGenerator.paragraph({ sentences: 6 }),
    sort_order: 1,
    is_active: true,
  } satisfies ICommunityPlatformCommunityRuleCategory.ICreate;

  const ruleCategory =
    await api.functional.communityPlatform.platformAdmin.communityRuleCategories.create(
      connection,
      { body: ruleCategoryCreateBody },
    );
  typia.assert<ICommunityPlatformCommunityRuleCategory>(ruleCategory);
  TestValidator.equals(
    "created rule category code must match request",
    ruleCategory.code,
    ruleCategoryCreateBody.code,
  );

  // 3. Switch back to memberUser (community creator) and create a community.
  const memberLoginForCommunity = await api.functional.auth.memberUser.login(
    connection,
    {
      body: {
        identifier: memberJoinBody.email,
        password: memberJoinBody.password,
        ip: null,
        href: "https://member.example.com/login-for-community",
        referrer: "https://member.example.com/landing",
      } satisfies ICommunityPlatformMemberuser.ILoginRequest,
    },
  );
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(
    memberLoginForCommunity,
  );

  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(10)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert<ICommunityPlatformCommunity>(community);
  TestValidator.equals(
    "created community identifier must match request",
    community.identifier,
    communityCreateBody.identifier,
  );

  // 4. Setup communityModerator actor who will create rules.
  const communityModeratorJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "password-moderator",
    display_name: RandomGenerator.name(2),
    ip: null,
    href: "https://moderator.example.com/join",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const communityModeratorJoin =
    await api.functional.auth.communityModerator.join(connection, {
      body: communityModeratorJoinBody,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    communityModeratorJoin,
  );

  const communityModeratorLogin =
    await api.functional.auth.communityModerator.login(connection, {
      body: {
        identifier: communityModeratorJoinBody.email,
        password: communityModeratorJoinBody.password,
        ip: null,
        href: "https://moderator.example.com/login",
        referrer: "https://moderator.example.com/landing",
      } satisfies ICommunityPlatformCommunityModerator.ILogin,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    communityModeratorLogin,
  );

  // 5. As communityModerator, create the first rule with a specific label.
  const ruleLabel = "no-spam";
  const firstRuleCreateBody = {
    label: ruleLabel,
    description: RandomGenerator.paragraph({ sentences: 10 }),
    display_order: 1,
    is_active: true,
    rule_category_code: ruleCategory.code,
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  const firstRule =
    await api.functional.communityPlatform.communityModerator.communities.rules.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: firstRuleCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityRule>(firstRule);

  TestValidator.equals(
    "first rule label must match request",
    firstRule.label,
    firstRuleCreateBody.label,
  );
  TestValidator.equals(
    "first rule description must match request",
    firstRule.description,
    firstRuleCreateBody.description,
  );
  TestValidator.equals(
    "first rule display_order must match request",
    firstRule.display_order,
    firstRuleCreateBody.display_order,
  );
  TestValidator.equals(
    "first rule is_active must match request",
    firstRule.is_active,
    firstRuleCreateBody.is_active,
  );

  // 6. Attempt to create a second rule in the same community with the same label.
  const secondRuleCreateBody = {
    label: ruleLabel, // same label as firstRule
    description: RandomGenerator.paragraph({ sentences: 7 }), // different description
    display_order: 2,
    is_active: true,
    rule_category_code: ruleCategory.code,
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  await TestValidator.error(
    "duplicate rule label within same community must fail",
    async () => {
      await api.functional.communityPlatform.communityModerator.communities.rules.create(
        connection,
        {
          communityIdentifier: community.identifier,
          body: secondRuleCreateBody,
        },
      );
    },
  );
}
