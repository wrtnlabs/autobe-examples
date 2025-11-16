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
 * Basic pagination for community rules listing as an authenticated memberUser.
 *
 * Business goal:
 *
 * - Ensure that a memberUser who owns a community can retrieve its rules in a
 *   paginated fashion using the PATCH rules.index endpoint, and that pagination
 *   metadata and page slicing behave correctly.
 *
 * Workflow:
 *
 * 1. Register a new memberUser via auth.memberUser.join, which also sets the
 *    Authorization header on the connection.
 * 2. As this memberUser, create a new community via
 *    communityPlatform.memberUser.communities.create, capturing its slug.
 * 3. Still authenticated as the same memberUser, create at least two rules for the
 *    community via communities.rules.create with distinct titles and versions
 *    and mixed is_active flags.
 * 4. Call communities.rules.index with page=1 and pageSize=1, asserting the
 *    response type and validating pagination and data fields.
 * 5. Optionally call communities.rules.index with page=2 and pageSize=1 to verify
 *    that a different rule appears, confirming paging behavior.
 */
export async function test_api_member_rules_index_basic_pagination(
  connection: api.IConnection,
) {
  // 1. Register a new memberUser and obtain authenticated context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorizedMember: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedMember);

  // 2. Create a new community as this memberUser
  const communityCreateBody = {
    slug: RandomGenerator.alphaNumeric(12),
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
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  const communitySlug: string = community.slug;

  // 3. Create at least two rules for this community
  const ruleCreateBody1 = {
    title: "Rules v1 - basic",
    body: RandomGenerator.content({ paragraphs: 2 }),
    version: 1 as number,
    is_active: true,
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  const ruleCreateBody2 = {
    title: "Rules v2 - extended",
    body: RandomGenerator.content({ paragraphs: 3 }),
    version: 2 as number,
    is_active: false,
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  const rule1: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.memberUser.communities.rules.create(
      connection,
      {
        communitySlug,
        body: ruleCreateBody1,
      },
    );
  typia.assert(rule1);

  const rule2: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.memberUser.communities.rules.create(
      connection,
      {
        communitySlug,
        body: ruleCreateBody2,
      },
    );
  typia.assert(rule2);

  // 4. Page 1 with pageSize=1
  const requestPage1 = {
    page: 1 as number,
    pageSize: 1 as number,
  } satisfies ICommunityPlatformCommunityRule.IRequest;

  const page1: IPageICommunityPlatformCommunityRule.ISummary =
    await api.functional.communityPlatform.memberUser.communities.rules.index(
      connection,
      {
        communitySlug,
        body: requestPage1,
      },
    );
  typia.assert(page1);

  const pagination1: IPage.IPagination = page1.pagination;
  typia.assert(pagination1);

  // Validate pagination metadata for page 1
  TestValidator.equals(
    "pagination current page should be 1",
    pagination1.current,
    1,
  );
  TestValidator.equals("pagination limit should be 1", pagination1.limit, 1);
  TestValidator.predicate(
    "pagination records should be at least 2",
    pagination1.records >= 2,
  );
  TestValidator.predicate(
    "pagination pages should be at least 2",
    pagination1.pages >= 2,
  );

  // data array should have exactly 1 element
  TestValidator.equals("page1 data length should be 1", page1.data.length, 1);

  const page1Rule: ICommunityPlatformCommunityRule.ISummary = page1.data[0];
  typia.assert(page1Rule);

  // Validate that the rule belongs to the created community
  TestValidator.equals(
    "page1 rule community slug must match created community",
    page1Rule.community.slug,
    communitySlug,
  );

  // Validate that the title/version match one of the created rules
  const createdRuleSummaries = [
    { id: rule1.id, title: rule1.title, version: rule1.version },
    { id: rule2.id, title: rule2.title, version: rule2.version },
  ];

  const page1MatchesCreated = createdRuleSummaries.some(
    (r) =>
      r.id === page1Rule.id &&
      r.title === page1Rule.title &&
      r.version === page1Rule.version,
  );

  TestValidator.predicate(
    "page1 rule must be one of the created rules",
    page1MatchesCreated,
  );

  // 5. Optional: request page 2 with the same pageSize
  const requestPage2 = {
    page: 2 as number,
    pageSize: 1 as number,
  } satisfies ICommunityPlatformCommunityRule.IRequest;

  const page2: IPageICommunityPlatformCommunityRule.ISummary =
    await api.functional.communityPlatform.memberUser.communities.rules.index(
      connection,
      {
        communitySlug,
        body: requestPage2,
      },
    );
  typia.assert(page2);

  const pagination2: IPage.IPagination = page2.pagination;
  typia.assert(pagination2);

  TestValidator.equals(
    "pagination current page for page2 should be 2",
    pagination2.current,
    2,
  );
  TestValidator.equals(
    "pagination limit for page2 should be 1",
    pagination2.limit,
    1,
  );
  TestValidator.predicate(
    "pagination records for page2 context should be at least 2",
    pagination2.records >= 2,
  );
  TestValidator.predicate(
    "pagination pages for page2 context should be at least 2",
    pagination2.pages >= 2,
  );

  TestValidator.equals("page2 data length should be 1", page2.data.length, 1);

  const page2Rule: ICommunityPlatformCommunityRule.ISummary = page2.data[0];
  typia.assert(page2Rule);

  TestValidator.equals(
    "page2 rule community slug must match created community",
    page2Rule.community.slug,
    communitySlug,
  );

  const page2MatchesCreated = createdRuleSummaries.some(
    (r) =>
      r.id === page2Rule.id &&
      r.title === page2Rule.title &&
      r.version === page2Rule.version,
  );

  TestValidator.predicate(
    "page2 rule must be one of the created rules",
    page2MatchesCreated,
  );

  // Ensure that the page2 rule is different from the page1 rule to
  // confirm that pagination is moving through the dataset.
  TestValidator.notEquals(
    "page1 and page2 rules should be different",
    page1Rule.id,
    page2Rule.id,
  );
}
