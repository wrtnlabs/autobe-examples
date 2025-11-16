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

export async function test_api_member_rules_index_search_by_keyword(
  connection: api.IConnection,
) {
  /**
   * 1. Register and authenticate a memberUser.
   * 2. Create a community under that memberUser.
   * 3. Create two community rules (Rule A and Rule B) with distinct keywords in
   *    their title/body.
   * 4. Use the rules.index PATCH endpoint with search=keywordA and verify that
   *    only Rule A appears (B is excluded).
   * 5. Use the rules.index PATCH endpoint with search=keywordB and verify that
   *    only Rule B appears (A is excluded).
   * 6. Additionally, verify that all returned summaries are scoped to the created
   *    community slug.
   */

  // ---------------------------------------------------------------------------
  // 1. Register and authenticate memberUser
  // ---------------------------------------------------------------------------
  const joinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // ---------------------------------------------------------------------------
  // 2. Create a community
  // ---------------------------------------------------------------------------
  const communitySlug: string & tags.MinLength<1> & tags.MaxLength<128> =
    RandomGenerator.alphaNumeric(12) as string &
      tags.MinLength<1> &
      tags.MaxLength<128>;

  const communityCreateBody = {
    slug: communitySlug,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
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
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // Ensure slug matches what we requested
  TestValidator.equals(
    "created community slug matches input",
    community.slug,
    communitySlug,
  );

  // ---------------------------------------------------------------------------
  // 3. Create two rules with distinct keywords
  // ---------------------------------------------------------------------------
  const keywordA = "spoilers";
  const keywordB = "off-topic";

  // Rule A: contains keywordA, not keywordB
  const ruleACreateBody = {
    title: `No ${keywordA} allowed in posts`,
    body: `${RandomGenerator.content({ paragraphs: 1 })}\nThis section explicitly covers ${keywordA} in detail.`,
    version: 1 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  const ruleA: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.memberUser.communities.rules.create(
      connection,
      {
        communitySlug: community.slug,
        body: ruleACreateBody,
      },
    );
  typia.assert(ruleA);

  // Rule B: contains keywordB only
  const ruleBCreateBody = {
    title: `Policy on ${keywordB} discussions`,
    body: `${RandomGenerator.content({ paragraphs: 1 })}\nGuidelines focus on ${keywordB} behavior and nothing else.`,
    version: 2 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  const ruleB: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.memberUser.communities.rules.create(
      connection,
      {
        communitySlug: community.slug,
        body: ruleBCreateBody,
      },
    );
  typia.assert(ruleB);

  // Sanity checks on created rules
  TestValidator.equals(
    "Rule A community slug in nested summary matches community",
    ruleA.community.slug,
    community.slug,
  );
  TestValidator.equals(
    "Rule B community slug in nested summary matches community",
    ruleB.community.slug,
    community.slug,
  );

  // ---------------------------------------------------------------------------
  // 4. Search by keywordA - expect Rule A, not Rule B
  // ---------------------------------------------------------------------------
  const searchByKeywordABody = {
    page: 1 as number & tags.Type<"int32">,
    pageSize: 10 as number & tags.Type<"int32">,
    search: keywordA,
  } satisfies ICommunityPlatformCommunityRule.IRequest;

  const pageForA: IPageICommunityPlatformCommunityRule.ISummary =
    await api.functional.communityPlatform.memberUser.communities.rules.index(
      connection,
      {
        communitySlug: community.slug,
        body: searchByKeywordABody,
      },
    );
  typia.assert(pageForA);

  // Verify pagination basic invariants
  TestValidator.predicate(
    "pageForA pagination current is >= 0",
    pageForA.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pageForA pagination limit is >= 0",
    pageForA.pagination.limit >= 0,
  );

  // Collect ids from search results
  const idsForA = pageForA.data.map((summary) => summary.id);

  TestValidator.predicate(
    "Rule A is included in search results for keywordA",
    idsForA.includes(ruleA.id),
  );
  TestValidator.predicate(
    "Rule B is NOT included in search results for keywordA",
    !idsForA.includes(ruleB.id),
  );

  // Ensure all summaries belong to the same community
  for (const summary of pageForA.data) {
    TestValidator.equals(
      "All keywordA search results belong to created community",
      summary.community.slug,
      community.slug,
    );
  }

  // ---------------------------------------------------------------------------
  // 5. Search by keywordB - expect Rule B, not Rule A
  // ---------------------------------------------------------------------------
  const searchByKeywordBBody = {
    page: 1 as number & tags.Type<"int32">,
    pageSize: 10 as number & tags.Type<"int32">,
    search: keywordB,
  } satisfies ICommunityPlatformCommunityRule.IRequest;

  const pageForB: IPageICommunityPlatformCommunityRule.ISummary =
    await api.functional.communityPlatform.memberUser.communities.rules.index(
      connection,
      {
        communitySlug: community.slug,
        body: searchByKeywordBBody,
      },
    );
  typia.assert(pageForB);

  const idsForB = pageForB.data.map((summary) => summary.id);

  TestValidator.predicate(
    "Rule B is included in search results for keywordB",
    idsForB.includes(ruleB.id),
  );
  TestValidator.predicate(
    "Rule A is NOT included in search results for keywordB",
    !idsForB.includes(ruleA.id),
  );

  for (const summary of pageForB.data) {
    TestValidator.equals(
      "All keywordB search results belong to created community",
      summary.community.slug,
      community.slug,
    );
  }
}
