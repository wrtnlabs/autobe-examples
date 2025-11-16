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

export async function test_api_community_rules_list_with_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register platform admin and create visibility levels + rule categories
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.join.example.com/",
    referrer: "https://landing.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  const visibilityLevelPublic: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: `public-${RandomGenerator.alphaNumeric(8)}`,
          name: "Public",
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(visibilityLevelPublic);

  const categoryA: ICommunityPlatformCommunityRuleCategory =
    await api.functional.communityPlatform.platformAdmin.communityRuleCategories.create(
      connection,
      {
        body: {
          code: `behavior-${RandomGenerator.alphaNumeric(6)}`,
          name: "Behavior",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          sort_order: 1,
          is_active: true,
        } satisfies ICommunityPlatformCommunityRuleCategory.ICreate,
      },
    );
  typia.assert(categoryA);

  const categoryB: ICommunityPlatformCommunityRuleCategory =
    await api.functional.communityPlatform.platformAdmin.communityRuleCategories.create(
      connection,
      {
        body: {
          code: `content-${RandomGenerator.alphaNumeric(6)}`,
          name: "Content Policy",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          sort_order: 2,
          is_active: true,
        } satisfies ICommunityPlatformCommunityRuleCategory.ICreate,
      },
    );
  typia.assert(categoryB);

  // 2. Register memberUser and create a community
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    ip: "127.0.0.1",
    href: "https://member.join.example.com/",
    referrer: "https://landing.example.com/",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberUser);

  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphaNumeric(6)}`,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityLevelPublic.code,
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

  // 3. Register community moderator
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://moderator.join.example.com/",
    referrer: "https://landing.example.com/",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderator: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderator);

  // 4. Create rules within the community as communityModerator
  const communityIdentifier = community.identifier;
  const keyword = "Alpha";

  const activeRuleBodies: ICommunityPlatformCommunityRule.ICreate[] = [
    {
      label: `${keyword} rule 1`,
      description: `${keyword} description one`,
      display_order: 1,
      is_active: true,
      rule_category_code: categoryA.code,
    },
    {
      label: `${keyword} rule 2`,
      description: `${keyword} description two`,
      display_order: 2,
      is_active: true,
      rule_category_code: categoryA.code,
    },
    {
      label: `${keyword} rule 3`,
      description: `${keyword} description three`,
      display_order: 3,
      is_active: true,
      rule_category_code: categoryA.code,
    },
  ];

  const activeOtherCategoryBody: ICommunityPlatformCommunityRule.ICreate = {
    label: "Beta rule different category",
    description: "This rule does not contain the shared keyword.",
    display_order: 10,
    is_active: true,
    rule_category_code: categoryB.code,
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  const inactiveRuleBody: ICommunityPlatformCommunityRule.ICreate = {
    label: `${keyword} inactive rule`,
    description: `${keyword} description inactive`,
    display_order: 20,
    is_active: false,
    rule_category_code: categoryA.code,
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  const createdActiveRules: ICommunityPlatformCommunityRule[] = [];

  for (const body of activeRuleBodies) {
    const rule =
      await api.functional.communityPlatform.communityModerator.communities.rules.create(
        connection,
        {
          communityIdentifier,
          body,
        },
      );
    typia.assert(rule);
    createdActiveRules.push(rule);
  }

  const ruleOtherCategory =
    await api.functional.communityPlatform.communityModerator.communities.rules.create(
      connection,
      {
        communityIdentifier,
        body: activeOtherCategoryBody,
      },
    );
  typia.assert(ruleOtherCategory);

  const inactiveRule =
    await api.functional.communityPlatform.communityModerator.communities.rules.create(
      connection,
      {
        communityIdentifier,
        body: inactiveRuleBody,
      },
    );
  typia.assert(inactiveRule);

  const matchingActiveRulesSorted = [...createdActiveRules].sort(
    (a, b) => a.display_order - b.display_order,
  );
  void matchingActiveRulesSorted;

  // 5. Call listing endpoint with filters: page 1
  const listRequestPage1 = {
    page: 1,
    limit: 2,
    search: keyword,
    rule_category_id: categoryA.id,
    is_active: true,
    order_by: "display_order",
    order_direction: "asc",
  } satisfies ICommunityPlatformCommunityRule.IRequest;

  const page1: IPageICommunityPlatformCommunityRule.ISummary =
    await api.functional.communityPlatform.communities.rules.index(connection, {
      communityIdentifier,
      body: listRequestPage1,
    });
  typia.assert(page1);

  const pagination1 = page1.pagination;
  TestValidator.equals(
    "page1 current page should be 1",
    1,
    pagination1.current,
  );
  TestValidator.equals("page1 limit should be 2", 2, pagination1.limit);
  TestValidator.predicate(
    "page1 records should be at least 3 for matching active rules",
    pagination1.records >= 3,
  );
  TestValidator.predicate(
    "page1 pages should be at least 2 when records >=3 and limit=2",
    pagination1.pages >= 2,
  );

  const page1Ids: string[] = [];
  let previousPosition: number | null = null;

  for (const summary of page1.data) {
    if (summary.community !== undefined) {
      TestValidator.equals(
        "summary community id matches created community",
        community.id,
        summary.community.id,
      );
    }

    TestValidator.predicate(
      "summary title or summary text should contain keyword Alpha",
      summary.title.includes(keyword) || summary.summary.includes(keyword),
    );

    if (summary.category !== undefined) {
      TestValidator.equals(
        "summary category should be categoryA",
        categoryA.id,
        summary.category.id,
      );
    }

    TestValidator.equals(
      "summary is_active should be true on filtered list",
      true,
      summary.is_active,
    );

    if (previousPosition !== null) {
      TestValidator.predicate(
        "summary positions should be non-decreasing (ascending)",
        previousPosition <= summary.position,
      );
    }
    previousPosition = summary.position;

    page1Ids.push(summary.id);
  }

  // 6. Request second page with same filters
  const listRequestPage2 = {
    page: 2,
    limit: 2,
    search: keyword,
    rule_category_id: categoryA.id,
    is_active: true,
    order_by: "display_order",
    order_direction: "asc",
  } satisfies ICommunityPlatformCommunityRule.IRequest;

  const page2: IPageICommunityPlatformCommunityRule.ISummary =
    await api.functional.communityPlatform.communities.rules.index(connection, {
      communityIdentifier,
      body: listRequestPage2,
    });
  typia.assert(page2);

  const pagination2 = page2.pagination;
  TestValidator.equals(
    "page2 current page should be 2",
    2,
    pagination2.current,
  );
  TestValidator.equals("page2 limit should be 2", 2, pagination2.limit);

  const page2Ids: string[] = [];
  for (const summary of page2.data) {
    page2Ids.push(summary.id);
    TestValidator.predicate(
      "page2 should not contain any ids from page1",
      page1Ids.includes(summary.id) === false,
    );
  }

  const combinedIds = [...page1Ids, ...page2Ids];
  TestValidator.predicate(
    "combined first two pages should include at least 3 matching active rules when available",
    combinedIds.length >= 3,
  );

  // 7. If there are more pages, check last page size <= limit
  if (pagination1.pages > 2) {
    const lastPageIndex = pagination1.pages;
    const lastRequest = {
      page: lastPageIndex,
      limit: 2,
      search: keyword,
      rule_category_id: categoryA.id,
      is_active: true,
      order_by: "display_order",
      order_direction: "asc",
    } satisfies ICommunityPlatformCommunityRule.IRequest;

    const lastPage: IPageICommunityPlatformCommunityRule.ISummary =
      await api.functional.communityPlatform.communities.rules.index(
        connection,
        {
          communityIdentifier,
          body: lastRequest,
        },
      );
    typia.assert(lastPage);

    TestValidator.equals(
      "last page current index should match pages",
      lastPageIndex,
      lastPage.pagination.current,
    );
    TestValidator.predicate(
      "last page data length should be <= limit",
      lastPage.data.length <= lastPage.pagination.limit,
    );
  }

  // 8. Negative: list inactive rules with same category and search
  const inactiveRequest = {
    page: 1,
    limit: 10,
    search: keyword,
    rule_category_id: categoryA.id,
    is_active: false,
    order_by: "display_order",
    order_direction: "asc",
  } satisfies ICommunityPlatformCommunityRule.IRequest;

  const inactivePage: IPageICommunityPlatformCommunityRule.ISummary =
    await api.functional.communityPlatform.communities.rules.index(connection, {
      communityIdentifier,
      body: inactiveRequest,
    });
  typia.assert(inactivePage);

  for (const summary of inactivePage.data) {
    TestValidator.equals(
      "inactive listing should have is_active=false",
      false,
      summary.is_active,
    );

    if (summary.category !== undefined) {
      TestValidator.equals(
        "inactive listing should be categoryA",
        categoryA.id,
        summary.category.id,
      );
    }

    TestValidator.predicate(
      "inactive listing titles or summaries contain keyword Alpha",
      summary.title.includes(keyword) || summary.summary.includes(keyword),
    );
  }
}
