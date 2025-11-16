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

export async function test_api_community_rule_update_basic_fields_by_moderator(
  connection: api.IConnection,
) {
  // 1. Bootstrap actors: platformAdmin, memberUser, communityModerator
  // Platform admin join
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `admin+${RandomGenerator.alphabets(8)}@example.com`,
    password: "P@ssw0rd!",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://platform.example.com/admin/join",
    referrer: "https://platform.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;
  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // platformAdmin login (not strictly necessary but exercises login flow)
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://platform.example.com/admin/login",
    referrer: "https://platform.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;
  const platformAdminLoginResult: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginResult);

  // Member user join
  const memberHref = "https://platform.example.com/member/join" as const;
  const memberReferrer = "https://platform.example.com/home" as const;
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `member+${RandomGenerator.alphabets(8)}@example.com` as string &
      tags.Format<"email">,
    password: "MemberP@ss1",
    ip: "127.0.0.1",
    href: memberHref,
    referrer: memberReferrer,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;
  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // Member login
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: "127.0.0.1",
    href: "https://platform.example.com/member/login",
    referrer: "https://platform.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;
  const memberLoginResult: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginResult);

  // Community moderator join
  const moderatorHref = "https://platform.example.com/mod/join" as const;
  const moderatorReferrer = "https://platform.example.com/home" as const;
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `mod+${RandomGenerator.alphabets(8)}@example.com` as string &
      tags.Format<"email">,
    password: "ModeratorP@ss1",
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: moderatorHref,
    referrer: moderatorReferrer,
  } satisfies ICommunityPlatformCommunityModerator.IJoin;
  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // Moderator login
  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: "127.0.0.1",
    href: "https://platform.example.com/mod/login",
    referrer: "https://platform.example.com/home",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;
  const moderatorLoginResult: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLoginResult);

  // 2. As platformAdmin, create a visibility level
  // (platformAdmin is already logged in from earlier step)
  const visibilityCode = `vis_${RandomGenerator.alphabets(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: `Visibility ${RandomGenerator.alphabets(4)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;
  const visibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibility);

  // 3. As platformAdmin, create a community rule category
  const categoryCode = `cat_${RandomGenerator.alphabets(6)}`;
  const categoryCreateBody = {
    code: categoryCode,
    name: `Category ${RandomGenerator.alphabets(4)}`,
    description: RandomGenerator.paragraph({ sentences: 6 }),
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

  // 4. As memberUser, create a community
  // Switch connection to memberUser context by logging in (already done above),
  // the SDK manages Authorization header updates.
  const communityIdentifier = `community_${RandomGenerator.alphabets(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: `Community ${RandomGenerator.alphabets(6)}`,
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibility.code,
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
    "community identifier should match the requested identifier",
    community.identifier,
    communityIdentifier,
  );

  // 5. As communityModerator, create initial rule under that community
  // Ensure moderator is logged in (login already executed above, but we can
  // re-login to be explicit about actor context).
  const moderatorLoginAgain: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLoginAgain);

  const initialRuleLabel = `Rule ${RandomGenerator.alphabets(5)}`;
  const initialRuleDescription = RandomGenerator.paragraph({ sentences: 10 });
  const initialRuleCreateBody = {
    label: initialRuleLabel,
    description: initialRuleDescription,
    display_order: 1 as number & tags.Type<"int32">,
    is_active: true,
    rule_category_code: category.code,
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
    "created rule should belong to the community",
    initialRule.community_id,
    community.id,
  );
  TestValidator.equals(
    "created rule label should match the input label",
    initialRule.label,
    initialRuleLabel,
  );
  TestValidator.equals(
    "created rule description should match the input description",
    initialRule.description,
    initialRuleDescription,
  );

  const originalRuleId = initialRule.id;
  const originalCommunityId = initialRule.community_id;
  const originalCreatedAt = initialRule.created_at;
  const originalUpdatedAt = initialRule.updated_at;

  // 6. Update the rule as the same moderator
  const updatedLabel = `${initialRuleLabel}_updated`;
  const updatedDescription = RandomGenerator.paragraph({ sentences: 12 });
  const updatedDisplayOrder = 5 as number & tags.Type<"int32">;
  const updatedIsActive = !initialRule.is_active;

  const updateBody = {
    label: updatedLabel,
    description: updatedDescription,
    display_order: updatedDisplayOrder,
    is_active: updatedIsActive,
    rule_category_code: category.code,
  } satisfies ICommunityPlatformCommunityRule.IUpdate;

  const updatedRule: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.communityModerator.communities.rules.update(
      connection,
      {
        communityIdentifier: community.identifier,
        ruleId: initialRule.id,
        body: updateBody,
      },
    );
  typia.assert(updatedRule);

  // 7. Business validations on updated rule
  TestValidator.equals(
    "rule id must remain unchanged after update",
    updatedRule.id,
    originalRuleId,
  );
  TestValidator.equals(
    "community_id must remain unchanged after rule update",
    updatedRule.community_id,
    originalCommunityId,
  );

  TestValidator.equals(
    "label should be updated to new value",
    updatedRule.label,
    updatedLabel,
  );
  TestValidator.equals(
    "description should be updated to new text",
    updatedRule.description,
    updatedDescription,
  );
  TestValidator.equals(
    "display_order should be updated",
    updatedRule.display_order,
    updatedDisplayOrder,
  );
  TestValidator.equals(
    "is_active flag should be toggled",
    updatedRule.is_active,
    updatedIsActive,
  );

  TestValidator.equals(
    "created_at should remain the same after update",
    updatedRule.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at should change after update",
    updatedRule.updated_at,
    originalUpdatedAt,
  );

  // If category summary is provided, ensure its code matches the category used
  if (updatedRule.category !== null && updatedRule.category !== undefined) {
    TestValidator.equals(
      "updated rule category code should match the configured category",
      updatedRule.category.code,
      category.code,
    );
  }
}
