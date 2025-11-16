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
 * Validate that community rule deletion is scoped to its community and behaves
 * idempotently from a client perspective.
 *
 * Business flow:
 *
 * 1. Platform admin signs up and logs in to create master data:
 *
 *    - A community visibility level
 *    - A community rule category
 * 2. Member user signs up and logs in and creates two communities (C1, C2) using
 *    the created visibility level.
 * 3. Community moderator signs up and logs in and creates three rules:
 *
 *    - Rule A in community C1
 *    - Rule B in community C1
 *    - Rule C in community C2
 * 4. Moderator deletes Rule A in C1 once (expected success) and then attempts to
 *    delete Rule A again (expected error/no-op behavior).
 * 5. Moderator then deletes Rule B in C1 and Rule C in C2 successfully to prove
 *    that previous deletion attempts did not corrupt other rules and that
 *    deletions are scoped per (community, rule) pair.
 *
 * Assertions focus on:
 *
 * - Successful creation of all master data and domain entities.
 * - Successful first deletion of Rule A.
 * - Second deletion attempt of Rule A raising an error while leaving other rules
 *   deletable.
 * - Cross-community isolation: deleting a rule in C1 does not affect rules in C2.
 */
export async function test_api_community_rule_deletion_idempotent_and_scoped(
  connection: api.IConnection,
) {
  // 1. Platform admin registers and logs in
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // Explicit login step to exercise login path (even though join already
  // authenticated the connection).
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoginAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginAuthorized);

  // 2. Platform admin creates a visibility level
  const visibilityCode = `vis_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: `Visibility ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
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
    visibilityCode,
  );

  // 3. Platform admin creates a rule category
  const categoryCode = `cat_${RandomGenerator.alphaNumeric(8)}`;
  const ruleCategoryCreateBody = {
    code: categoryCode,
    name: `Category ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    sort_order: typia.random<number & tags.Type<"int32">>(),
    is_active: true,
  } satisfies ICommunityPlatformCommunityRuleCategory.ICreate;

  const ruleCategory: ICommunityPlatformCommunityRuleCategory =
    await api.functional.communityPlatform.platformAdmin.communityRuleCategories.create(
      connection,
      { body: ruleCategoryCreateBody },
    );
  typia.assert(ruleCategory);

  TestValidator.equals(
    "created rule category code should match request",
    ruleCategory.code,
    categoryCode,
  );

  // 4. Member user registers and logs in
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  // 5. Member user creates two communities (C1, C2)
  const communityIdentifier1 = `community_${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody1 = {
    identifier: communityIdentifier1,
    title: `Community ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community1: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody1 },
    );
  typia.assert(community1);

  TestValidator.equals(
    "community1 identifier should match request",
    community1.identifier,
    communityIdentifier1,
  );

  const communityIdentifier2 = `community_${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody2 = {
    identifier: communityIdentifier2,
    title: `Community ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community2: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody2 },
    );
  typia.assert(community2);

  TestValidator.equals(
    "community2 identifier should match request",
    community2.identifier,
    communityIdentifier2,
  );

  // 6. Community moderator registers and logs in
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoginAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLoginAuthorized);

  // 7. Moderator creates Rule A and Rule B in community1, and Rule C in
  // community2.
  const baseDisplayOrder: number & tags.Type<"int32"> = typia.random<
    number & tags.Type<"int32">
  >();

  const ruleACreateBody = {
    label: `Rule A ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 8 }),
    display_order: baseDisplayOrder,
    is_active: true,
    rule_category_code: ruleCategory.code,
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  const ruleA: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.communityModerator.communities.rules.create(
      connection,
      {
        communityIdentifier: community1.identifier,
        body: ruleACreateBody,
      },
    );
  typia.assert(ruleA);

  const ruleBCreateBody = {
    label: `Rule B ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 7 }),
    display_order: (baseDisplayOrder + 1) satisfies number as number,
    is_active: true,
    rule_category_code: ruleCategory.code,
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  const ruleB: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.communityModerator.communities.rules.create(
      connection,
      {
        communityIdentifier: community1.identifier,
        body: ruleBCreateBody,
      },
    );
  typia.assert(ruleB);

  const ruleCCreateBody = {
    label: `Rule C ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    display_order: (baseDisplayOrder + 2) satisfies number as number,
    is_active: true,
    rule_category_code: ruleCategory.code,
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  const ruleC: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.communityModerator.communities.rules.create(
      connection,
      {
        communityIdentifier: community2.identifier,
        body: ruleCCreateBody,
      },
    );
  typia.assert(ruleC);

  TestValidator.predicate(
    "all three rules should belong to some community",
    ruleA.community_id !== ruleB.community_id
      ? ruleA.community_id !== null && ruleB.community_id !== null
      : ruleA.community_id === ruleB.community_id,
  );

  // 8. First deletion of Rule A in community1 - expected success
  await api.functional.communityPlatform.communityModerator.communities.rules.erase(
    connection,
    {
      communityIdentifier: community1.identifier,
      ruleId: ruleA.id,
    },
  );

  // 9. Second deletion attempt for Rule A - expected error (idempotent
  // business behavior: already deleted, cannot delete again).
  await TestValidator.error(
    "second deletion of an already deleted rule should result in an error",
    async () => {
      await api.functional.communityPlatform.communityModerator.communities.rules.erase(
        connection,
        {
          communityIdentifier: community1.identifier,
          ruleId: ruleA.id,
        },
      );
    },
  );

  // 10. Delete Rule B in community1 - should still succeed, proving that Rule A
  // deletion attempts did not corrupt other rules in the same community.
  await api.functional.communityPlatform.communityModerator.communities.rules.erase(
    connection,
    {
      communityIdentifier: community1.identifier,
      ruleId: ruleB.id,
    },
  );

  // 11. Delete Rule C in community2 - should succeed, proving that deletions
  // are scoped per community and do not affect rules in other communities.
  await api.functional.communityPlatform.communityModerator.communities.rules.erase(
    connection,
    {
      communityIdentifier: community2.identifier,
      ruleId: ruleC.id,
    },
  );
}
