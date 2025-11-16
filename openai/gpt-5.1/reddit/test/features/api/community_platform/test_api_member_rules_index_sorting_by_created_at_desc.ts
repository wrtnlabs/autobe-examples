import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityRule";

/**
 * Verify that community rule listing supports ordering by created_at in
 * descending order (and optionally ascending) via
 * ICommunityPlatformCommunityRule.IRequest.
 *
 * Business context: Community owners or member users need to view rule
 * documents in a predictable order, usually with the newest rule versions
 * first. The rules.index endpoint supports orderBy/orderDirection parameters,
 * and this test ensures that when using orderBy="created_at" and
 * orderDirection="desc", the most recently created rules appear first and the
 * list is globally sorted by created_at in descending order. It also optionally
 * validates ascending ordering semantics.
 *
 * Scenario steps:
 *
 * 1. Register a new community platform member user (auth.memberUser.join) to
 *    obtain an authenticated context.
 * 2. Create a community as this member user
 *    (communityPlatform.memberUser.communities.create) and capture its slug.
 * 3. Create at least two community rules for that community
 *    (communities.rules.create) with different version numbers and a short
 *    delay between creations to ensure distinct created_at values.
 * 4. Invoke communities.rules.index (PATCH) with orderBy="created_at" and
 *    orderDirection="desc", with pageSize large enough to contain all created
 *    rules.
 * 5. Assert that the returned page is a valid
 *    IPageICommunityPlatformCommunityRule.ISummary.
 * 6. Filter the data array for rules belonging to our community and matching the
 *    created rule ids. Verify that:
 *
 *    - At least two such rules exist.
 *    - The rules are sorted in descending created_at order (newest first).
 * 7. Optionally repeat the index call with orderDirection="asc" and verify
 *    ascending created_at order (oldest first) for our subset of rules.
 */
export async function test_api_member_rules_index_sorting_by_created_at_desc(
  connection: api.IConnection,
) {
  // 1. Register a member user and obtain authorized context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create a community for this member user
  const communityBody = {
    slug: `${RandomGenerator.alphaNumeric(10)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
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

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert(community);

  // 3. Create at least two community rules for this community
  const ruleBodies: ICommunityPlatformCommunityRule.ICreate[] = [
    {
      title: "First Rules Version",
      body: RandomGenerator.content({ paragraphs: 2 }),
      version: 1,
      is_active: true,
    },
    {
      title: "Second Rules Version",
      body: RandomGenerator.content({ paragraphs: 3 }),
      version: 2,
      is_active: false,
    },
  ];

  const createdRules: ICommunityPlatformCommunityRule[] = [];
  for (const body of ruleBodies) {
    const created: ICommunityPlatformCommunityRule =
      await api.functional.communityPlatform.memberUser.communities.rules.create(
        connection,
        {
          communitySlug: community.slug,
          body,
        },
      );
    typia.assert(created);
    createdRules.push(created);
  }

  // 4. Call rules.index with orderBy created_at and orderDirection desc
  const indexRequestDesc = {
    page: 1,
    pageSize: 10,
    search: undefined,
    isActive: null,
    orderBy: "created_at",
    orderDirection: "desc",
  } satisfies ICommunityPlatformCommunityRule.IRequest;

  const pageDesc: IPageICommunityPlatformCommunityRule.ISummary =
    await api.functional.communityPlatform.memberUser.communities.rules.index(
      connection,
      {
        communitySlug: community.slug,
        body: indexRequestDesc,
      },
    );
  typia.assert(pageDesc);

  // 5. Filter results for our created rules by id
  const createdIds = createdRules.map((r) => r.id);
  const matchingDesc = pageDesc.data.filter((summary) =>
    createdIds.includes(summary.id),
  );

  TestValidator.predicate(
    "at least two matching rules should be returned in desc order",
    matchingDesc.length >= 2,
  );

  // 6. Verify descending created_at order among matching rules
  for (let i = 0; i < matchingDesc.length - 1; ++i) {
    const current = matchingDesc[i];
    const next = matchingDesc[i + 1];
    TestValidator.predicate(
      `rules should be sorted by created_at desc at index ${i}`,
      current.created_at >= next.created_at,
    );
  }

  // Verify that the first matching rule corresponds to the most recent created_at
  const latest = matchingDesc.reduce(
    (max, cur) => (max.created_at >= cur.created_at ? max : cur),
    matchingDesc[0],
  );

  TestValidator.equals(
    "first matching rule in desc page should be the latest by created_at",
    matchingDesc[0].id,
    latest.id,
  );

  // 7. Optionally test ascending order
  const indexRequestAsc = {
    page: 1,
    pageSize: 10,
    search: undefined,
    isActive: null,
    orderBy: "created_at",
    orderDirection: "asc",
  } satisfies ICommunityPlatformCommunityRule.IRequest;

  const pageAsc: IPageICommunityPlatformCommunityRule.ISummary =
    await api.functional.communityPlatform.memberUser.communities.rules.index(
      connection,
      {
        communitySlug: community.slug,
        body: indexRequestAsc,
      },
    );
  typia.assert(pageAsc);

  const matchingAsc = pageAsc.data.filter((summary) =>
    createdIds.includes(summary.id),
  );

  TestValidator.predicate(
    "at least two matching rules should be returned in asc order",
    matchingAsc.length >= 2,
  );

  for (let i = 0; i < matchingAsc.length - 1; ++i) {
    const current = matchingAsc[i];
    const next = matchingAsc[i + 1];
    TestValidator.predicate(
      `rules should be sorted by created_at asc at index ${i}`,
      current.created_at <= next.created_at,
    );
  }

  const oldest = matchingAsc.reduce(
    (min, cur) => (min.created_at <= cur.created_at ? min : cur),
    matchingAsc[0],
  );

  TestValidator.equals(
    "first matching rule in asc page should be the oldest by created_at",
    matchingAsc[0].id,
    oldest.id,
  );
}
