import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityRule";

export async function test_api_admin_rules_index_search_and_sort_combined(
  connection: api.IConnection,
) {
  // 1. Register a memberUser
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberUser = await api.functional.auth.memberUser.join(connection, {
    body: memberJoinBody,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberUser);

  // 2. Create a community as the memberUser
  const communitySlug = `community-${RandomGenerator.alphaNumeric(12)}`;

  const communityBody = {
    slug: communitySlug,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. Create rules for the community as memberUser
  const keyword = "harassment";

  // Rule A - matches keyword in title and body
  const ruleABody = {
    title: `Rule about ${keyword}`,
    body: `${RandomGenerator.paragraph({ sentences: 8 })} ${keyword} `,
    version: 1,
    is_active: true,
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  const ruleA =
    await api.functional.communityPlatform.memberUser.communities.rules.create(
      connection,
      {
        communitySlug: communitySlug,
        body: ruleABody,
      },
    );
  typia.assert<ICommunityPlatformCommunityRule>(ruleA);

  // Rule B - does not match keyword at all
  const ruleBBody = {
    title: "General posting etiquette",
    body: RandomGenerator.paragraph({ sentences: 6 }),
    version: 2,
    is_active: true,
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  const ruleB =
    await api.functional.communityPlatform.memberUser.communities.rules.create(
      connection,
      {
        communitySlug: communitySlug,
        body: ruleBBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityRule>(ruleB);

  // Rule C - matches keyword in title
  const ruleCBody = {
    title: `${keyword} escalation policy`,
    body: RandomGenerator.paragraph({ sentences: 4 }),
    version: 3,
    is_active: true,
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  const ruleC =
    await api.functional.communityPlatform.memberUser.communities.rules.create(
      connection,
      {
        communitySlug: communitySlug,
        body: ruleCBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityRule>(ruleC);

  // Expected matching rule IDs for the keyword search
  const expectedMatchingIds = [ruleA.id, ruleC.id];

  // 4. Register an adminUser
  const adminJoinBody = {
    username: `admin-${RandomGenerator.alphabets(6)}`,
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminJoin = await api.functional.auth.adminUser.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminJoin);

  // 5. Login as the same adminUser
  const adminLoginBody = {
    identifier: adminJoin.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://example.com/admin/login",
    referrer: "https://example.com/admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLogin = await api.functional.auth.adminUser.login(connection, {
    body: adminLoginBody,
  });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminLogin);

  // 6. Admin searches rules with keyword + sort by created_at desc
  const searchRequestDesc = {
    page: 1,
    pageSize: 10,
    search: keyword,
    isActive: null,
    orderBy: "created_at",
    orderDirection: "desc",
  } satisfies ICommunityPlatformCommunityRule.IRequest;

  const pageDesc =
    await api.functional.communityPlatform.adminUser.communities.rules.index(
      connection,
      {
        communitySlug: communitySlug,
        body: searchRequestDesc,
      },
    );
  typia.assert<IPageICommunityPlatformCommunityRule.ISummary>(pageDesc);

  const recordsDesc = pageDesc.data;

  // Basic assertions on pagination
  TestValidator.equals(
    "pagination current page should be 1 for desc",
    pageDesc.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches requested pageSize for desc",
    pageDesc.pagination.limit,
    searchRequestDesc.pageSize,
  );

  // We know exactly two rules contain the keyword in this community (Rule A & C)
  const expectedMatchingCount = expectedMatchingIds.length;
  TestValidator.equals(
    "records count for desc equals expected matching rules",
    pageDesc.pagination.records,
    expectedMatchingCount,
  );
  TestValidator.equals(
    "data length for desc equals expected matching rules",
    recordsDesc.length,
    expectedMatchingCount,
  );

  // Validate each rule belongs to the community and is one of the expected IDs
  for (const rule of recordsDesc) {
    TestValidator.equals(
      "rule community slug matches created community (desc)",
      rule.community.slug,
      communitySlug,
    );
    TestValidator.predicate(
      "rule id is one of expected keyword-matching rules (desc)",
      expectedMatchingIds.includes(rule.id),
    );
    TestValidator.predicate(
      "rule title contains keyword for desc search (summary-level check)",
      rule.title.includes(keyword),
    );
  }

  // Validate sorted by created_at desc (ISO strings are lexicographically sortable)
  for (let i = 0; i < recordsDesc.length - 1; i++) {
    const a = recordsDesc[i];
    const b = recordsDesc[i + 1];
    TestValidator.predicate(
      `created_at desc order at index ${i}`,
      a.created_at >= b.created_at,
    );
  }

  // 7. Repeat with orderDirection asc to confirm ascending sort
  const searchRequestAsc = {
    page: 1,
    pageSize: 10,
    search: keyword,
    isActive: null,
    orderBy: "created_at",
    orderDirection: "asc",
  } satisfies ICommunityPlatformCommunityRule.IRequest;

  const pageAsc =
    await api.functional.communityPlatform.adminUser.communities.rules.index(
      connection,
      {
        communitySlug: communitySlug,
        body: searchRequestAsc,
      },
    );
  typia.assert<IPageICommunityPlatformCommunityRule.ISummary>(pageAsc);

  const recordsAsc = pageAsc.data;

  TestValidator.equals(
    "pagination current page should be 1 for asc",
    pageAsc.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches requested pageSize for asc",
    pageAsc.pagination.limit,
    searchRequestAsc.pageSize,
  );
  TestValidator.equals(
    "records count for asc equals expected matching rules",
    pageAsc.pagination.records,
    expectedMatchingCount,
  );
  TestValidator.equals(
    "data length for asc equals expected matching rules",
    recordsAsc.length,
    expectedMatchingCount,
  );

  for (const rule of recordsAsc) {
    TestValidator.equals(
      "rule community slug matches created community (asc)",
      rule.community.slug,
      communitySlug,
    );
    TestValidator.predicate(
      "rule id is one of expected keyword-matching rules (asc)",
      expectedMatchingIds.includes(rule.id),
    );
    TestValidator.predicate(
      "rule title contains keyword for asc search (summary-level check)",
      rule.title.includes(keyword),
    );
  }

  for (let i = 0; i < recordsAsc.length - 1; i++) {
    const a = recordsAsc[i];
    const b = recordsAsc[i + 1];
    TestValidator.predicate(
      `created_at asc order at index ${i}`,
      a.created_at <= b.created_at,
    );
  }
}
