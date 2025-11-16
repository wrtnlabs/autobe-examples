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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityRule";

export async function test_api_community_rules_list_excludes_other_communities(
  connection: api.IConnection,
) {
  // 1. platformAdmin joins and logs in
  const platformAdminJoin = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: {
        username: RandomGenerator.alphabets(8),
        email: `${RandomGenerator.alphabets(8)}@example.com`,
        password: "Password!123",
        displayName: RandomGenerator.name(),
        ip: "127.0.0.1",
        href: "https://admin.example.com/join",
        referrer: "https://admin.example.com/landing",
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    },
  );
  typia.assert(platformAdminJoin);

  // 2. Create a visibility level as platformAdmin
  const visibilityLevelCode = `vis_${RandomGenerator.alphabets(6)}`;
  const visibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: visibilityLevelCode,
          name: "Test Visibility Level",
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Create a rule category as platformAdmin
  const ruleCategoryCode = `rule_cat_${RandomGenerator.alphabets(6)}`;
  const ruleCategory =
    await api.functional.communityPlatform.platformAdmin.communityRuleCategories.create(
      connection,
      {
        body: {
          code: ruleCategoryCode,
          name: "Behavior",
          description: RandomGenerator.paragraph({ sentences: 5 }),
          sort_order: 1,
          is_active: true,
        } satisfies ICommunityPlatformCommunityRuleCategory.ICreate,
      },
    );
  typia.assert(ruleCategory);

  // 4. memberUser A joins and logs in
  const memberUserAEmail = `${RandomGenerator.alphabets(8)}@userA.com`;
  const memberUserAJoin = await api.functional.auth.memberUser.join(
    connection,
    {
      body: {
        username: RandomGenerator.alphabets(8),
        email: memberUserAEmail as string & tags.Format<"email">,
        password: "Password!123",
        ip: "127.0.0.1",
        href: "https://app.example.com/join-a",
        referrer: "https://app.example.com/landing",
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    },
  );
  typia.assert(memberUserAJoin);

  const memberUserALogin = await api.functional.auth.memberUser.login(
    connection,
    {
      body: {
        identifier: memberUserAEmail,
        password: "Password!123",
        ip: "127.0.0.1",
        href: "https://app.example.com/login-a",
        referrer: "https://app.example.com/landing",
      } satisfies ICommunityPlatformMemberuser.ILoginRequest,
    },
  );
  typia.assert(memberUserALogin);

  // 5. memberUser A creates Community A
  const communityAIdentifier = `communityA_${RandomGenerator.alphabets(6)}`;
  const communityA =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: communityAIdentifier,
          title: "Community A",
          description: RandomGenerator.paragraph({ sentences: 5 }),
          visibilityLevelCode,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityA);

  // 6. memberUser B joins and logs in
  const memberUserBEmail = `${RandomGenerator.alphabets(8)}@userB.com`;
  const memberUserBJoin = await api.functional.auth.memberUser.join(
    connection,
    {
      body: {
        username: RandomGenerator.alphabets(8),
        email: memberUserBEmail as string & tags.Format<"email">,
        password: "Password!123",
        ip: "127.0.0.1",
        href: "https://app.example.com/join-b",
        referrer: "https://app.example.com/landing",
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    },
  );
  typia.assert(memberUserBJoin);

  const memberUserBLogin = await api.functional.auth.memberUser.login(
    connection,
    {
      body: {
        identifier: memberUserBEmail,
        password: "Password!123",
        ip: "127.0.0.1",
        href: "https://app.example.com/login-b",
        referrer: "https://app.example.com/landing",
      } satisfies ICommunityPlatformMemberuser.ILoginRequest,
    },
  );
  typia.assert(memberUserBLogin);

  // 7. memberUser B creates Community B
  const communityBIdentifier = `communityB_${RandomGenerator.alphabets(6)}`;
  const communityB =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: communityBIdentifier,
          title: "Community B",
          description: RandomGenerator.paragraph({ sentences: 5 }),
          visibilityLevelCode,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityB);

  // 8. communityModerator joins and logs in
  const moderatorEmail = `${RandomGenerator.alphabets(8)}@mod.com`;
  const moderatorJoin = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        username: RandomGenerator.alphabets(8),
        email: moderatorEmail as string & tags.Format<"email">,
        password: "Password!123",
        display_name: RandomGenerator.name(),
        ip: "127.0.0.1",
        href: "https://mod.example.com/join",
        referrer: "https://mod.example.com/landing",
      } satisfies ICommunityPlatformCommunityModerator.IJoin,
    },
  );
  typia.assert(moderatorJoin);

  const moderatorLogin = await api.functional.auth.communityModerator.login(
    connection,
    {
      body: {
        identifier: moderatorEmail,
        password: "Password!123",
        ip: "127.0.0.1",
        href: "https://mod.example.com/login",
        referrer: "https://mod.example.com/landing",
      } satisfies ICommunityPlatformCommunityModerator.ILogin,
    },
  );
  typia.assert(moderatorLogin);

  // 9. communityModerator creates rules for Community A and Community B
  const communityARuleLabels: string[] = [];
  const communityBRuleLabels: string[] = [];

  const createRuleForCommunity = async (
    communityIdentifier: string,
    expectedCommunityId: string & tags.Format<"uuid">,
    labelPrefix: string,
    collection: string[],
  ) => {
    const ruleCount = 3;
    for (let i = 0; i < ruleCount; i++) {
      const label = `${labelPrefix}_rule_${i}`;
      collection.push(label);
      const rule =
        await api.functional.communityPlatform.communityModerator.communities.rules.create(
          connection,
          {
            communityIdentifier,
            body: {
              label,
              description: RandomGenerator.paragraph({ sentences: 6 }),
              display_order: i + 1,
              is_active: true,
              rule_category_code: ruleCategoryCode,
            } satisfies ICommunityPlatformCommunityRule.ICreate,
          },
        );
      typia.assert(rule);
      TestValidator.equals(
        "rule community id matches expected community",
        rule.community_id,
        expectedCommunityId,
      );
    }
  };

  await createRuleForCommunity(
    communityA.identifier,
    communityA.id,
    "communityA",
    communityARuleLabels,
  );
  await createRuleForCommunity(
    communityB.identifier,
    communityB.id,
    "communityB",
    communityBRuleLabels,
  );

  // 10. List rules for Community A
  const rulesPageForA =
    await api.functional.communityPlatform.communities.rules.index(connection, {
      communityIdentifier: communityA.identifier,
      body: {},
    });
  typia.assert(rulesPageForA);

  // 11. Assert that all rules in the response (if community is present) belong to Community A
  for (const summary of rulesPageForA.data) {
    if (summary.community !== undefined) {
      TestValidator.equals(
        "summary community id must be Community A",
        summary.community.id,
        communityA.id,
      );
    }
  }

  // 12. Assert that none of Community B's labels appear in Community A listing
  for (const bLabel of communityBRuleLabels) {
    const found = rulesPageForA.data.some((s) => s.title === bLabel);
    TestValidator.predicate(
      `Community A rules listing must not contain B label ${bLabel}`,
      !found,
    );
  }

  // 13. List rules for Community B and assert symmetry
  const rulesPageForB =
    await api.functional.communityPlatform.communities.rules.index(connection, {
      communityIdentifier: communityB.identifier,
      body: {},
    });
  typia.assert(rulesPageForB);

  for (const summary of rulesPageForB.data) {
    if (summary.community !== undefined) {
      TestValidator.equals(
        "summary community id must be Community B",
        summary.community.id,
        communityB.id,
      );
    }
  }

  for (const aLabel of communityARuleLabels) {
    const found = rulesPageForB.data.some((s) => s.title === aLabel);
    TestValidator.predicate(
      `Community B rules listing must not contain A label ${aLabel}`,
      !found,
    );
  }
}
