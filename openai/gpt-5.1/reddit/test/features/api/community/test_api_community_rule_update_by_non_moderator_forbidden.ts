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
 * Verify that non-moderator actors cannot update community rules via the
 * communityModerator-scoped update endpoint, while community moderators can.
 *
 * Business context:
 *
 * - PlatformAdmin manages global taxonomies like visibility levels and rule
 *   categories.
 * - MemberUser can create communities but should not be able to use
 *   moderator-only rule update endpoints.
 * - CommunityModerator is allowed to manage rules for communities.
 *
 * Scenario steps:
 *
 * 1. Create and authenticate three actors: platformAdmin, communityModerator,
 *    memberUser.
 * 2. As platformAdmin, create a visibility level and a rule category.
 * 3. As memberUser, create a community with the created visibility level.
 * 4. As communityModerator, create an initial rule in that community.
 * 5. As memberUser (non-moderator), attempt to update the rule via the
 *    moderator-scoped update endpoint and assert that it fails.
 * 6. As communityModerator, perform a valid update and verify that the rule is
 *    actually updatable when using correct actor.
 */
export async function test_api_community_rule_update_by_non_moderator_forbidden(
  connection: api.IConnection,
) {
  // 1. Register all actors with deterministic but random-looking data
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://platform.example.com/admin/join",
    referrer: "https://platform.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    display_name: RandomGenerator.name(),
    ip: undefined,
    href: "https://platform.example.com/moderator/join",
    referrer: "https://platform.example.com/",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const communityModeratorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(communityModeratorAuthorized);

  const memberJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    ip: undefined,
    href: "https://platform.example.com/member/join",
    referrer: "https://platform.example.com/",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. As platformAdmin, create a visibility level and rule category
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: platformAdminJoinBody.email,
      password: platformAdminJoinBody.password,
      ip: undefined,
      href: "https://platform.example.com/admin/login",
      referrer: "https://platform.example.com/",
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  const visibilityLevelBody = {
    code: `vis_${RandomGenerator.alphabets(6)}`,
    name: "Public Visibility",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelBody,
      },
    );
  typia.assert(visibilityLevel);

  const ruleCategoryBody = {
    code: `cat_${RandomGenerator.alphabets(6)}`,
    name: "Behavior",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    sort_order: 1 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies ICommunityPlatformCommunityRuleCategory.ICreate;

  const ruleCategory: ICommunityPlatformCommunityRuleCategory =
    await api.functional.communityPlatform.platformAdmin.communityRuleCategories.create(
      connection,
      {
        body: ruleCategoryBody,
      },
    );
  typia.assert(ruleCategory);

  // 3. As memberUser, create a community using the created visibility level
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberJoinBody.email,
      password: memberJoinBody.password,
      ip: undefined,
      href: "https://platform.example.com/member/login",
      referrer: "https://platform.example.com/",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const communityCreateBody = {
    identifier: `community_${RandomGenerator.alphabets(8)}`,
    title: "Test Community for Rule Update",
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

  // 4. As communityModerator, create an initial rule in that community
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      identifier: moderatorJoinBody.email,
      password: moderatorJoinBody.password,
      ip: undefined,
      href: "https://platform.example.com/moderator/login",
      referrer: "https://platform.example.com/",
    } satisfies ICommunityPlatformCommunityModerator.ILogin,
  });

  const initialRuleBody = {
    label: "No spam",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    display_order: 1 as number & tags.Type<"int32">,
    is_active: true,
    rule_category_code: ruleCategory.code,
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  const createdRule: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.communityModerator.communities.rules.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: initialRuleBody,
      },
    );
  typia.assert(createdRule);

  // 5. As memberUser (non-moderator), attempt to update the rule via moderator endpoint
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberJoinBody.email,
      password: memberJoinBody.password,
      ip: undefined,
      href: "https://platform.example.com/member/login2",
      referrer: "https://platform.example.com/",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const forbiddenUpdateBody = {
    label: "Attempted unauthorized edit",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: 2 as number & tags.Type<"int32">,
    is_active: false,
    rule_category_code: ruleCategory.code,
  } satisfies ICommunityPlatformCommunityRule.IUpdate;

  await TestValidator.error(
    "memberUser must not be able to update rule via moderator endpoint",
    async () => {
      await api.functional.communityPlatform.communityModerator.communities.rules.update(
        connection,
        {
          communityIdentifier: community.identifier,
          ruleId: createdRule.id,
          body: forbiddenUpdateBody,
        },
      );
    },
  );

  // 6. As communityModerator, perform a valid update and verify changes
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      identifier: moderatorJoinBody.email,
      password: moderatorJoinBody.password,
      ip: undefined,
      href: "https://platform.example.com/moderator/login2",
      referrer: "https://platform.example.com/",
    } satisfies ICommunityPlatformCommunityModerator.ILogin,
  });

  const moderatorUpdateBody = {
    label: "No spam or self-promotion",
    description: RandomGenerator.paragraph({ sentences: 6 }),
    display_order: 10 as number & tags.Type<"int32">,
    is_active: true,
    rule_category_code: ruleCategory.code,
  } satisfies ICommunityPlatformCommunityRule.IUpdate;

  const updatedRule: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.communityModerator.communities.rules.update(
      connection,
      {
        communityIdentifier: community.identifier,
        ruleId: createdRule.id,
        body: moderatorUpdateBody,
      },
    );
  typia.assert(updatedRule);

  // Ensure that the moderator update actually changed the rule, confirming that
  // the endpoint itself is functional when used with correct actor.
  TestValidator.notEquals(
    "rule label should change after moderator update",
    createdRule.label,
    updatedRule.label,
  );
  TestValidator.notEquals(
    "rule description should change after moderator update",
    createdRule.description,
    updatedRule.description,
  );
  TestValidator.notEquals(
    "rule display_order should change after moderator update",
    createdRule.display_order,
    updatedRule.display_order,
  );
}
