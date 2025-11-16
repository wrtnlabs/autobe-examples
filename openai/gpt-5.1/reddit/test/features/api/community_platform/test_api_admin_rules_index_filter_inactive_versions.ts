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

export async function test_api_admin_rules_index_filter_inactive_versions(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a memberUser
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 2. Create a community as this memberUser
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
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. Create multiple rules (inactive and active) for this community
  const inactiveRuleBody = {
    title: "Historical Rules - Draft",
    body: RandomGenerator.content({ paragraphs: 2 }),
    version: 1 as number & tags.Type<"int32">,
    is_active: false,
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  const inactiveRule: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.memberUser.communities.rules.create(
      connection,
      {
        communitySlug: community.slug,
        body: inactiveRuleBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityRule>(inactiveRule);

  const activeRuleBody = {
    title: "Current Community Rules",
    body: RandomGenerator.content({ paragraphs: 3 }),
    version: 2 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  const activeRule: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.memberUser.communities.rules.create(
      connection,
      {
        communitySlug: community.slug,
        body: activeRuleBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityRule>(activeRule);

  // 4. Register and authenticate an adminUser
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 5. As adminUser, call index with isActive=false and large pageSize
  const pageSize: number & tags.Type<"int32"> = 50 as number &
    tags.Type<"int32">;

  const inactiveIndexRequest = {
    page: 1 as number & tags.Type<"int32">,
    pageSize,
    search: undefined,
    isActive: false,
    orderBy: undefined,
    orderDirection: undefined,
  } satisfies ICommunityPlatformCommunityRule.IRequest;

  const inactivePage: IPageICommunityPlatformCommunityRule.ISummary =
    await api.functional.communityPlatform.adminUser.communities.rules.index(
      connection,
      {
        communitySlug: community.slug,
        body: inactiveIndexRequest,
      },
    );
  typia.assert<IPageICommunityPlatformCommunityRule.ISummary>(inactivePage);

  // 6. Validate pagination
  TestValidator.predicate(
    "pagination limit should be positive",
    inactivePage.pagination.limit > 0,
  );

  // 7. Validate that every element is inactive and that the created inactive rule is present
  const allInactive = inactivePage.data.every(
    (rule) => rule.is_active === false,
  );
  TestValidator.predicate(
    "all rules in inactive-only listing must have is_active === false",
    allInactive,
  );

  const foundInactive = inactivePage.data.find(
    (rule) =>
      rule.id === inactiveRule.id && rule.version === inactiveRule.version,
  );
  TestValidator.predicate(
    "inactive rule created by memberUser should be present in inactive-only admin listing",
    foundInactive !== undefined,
  );

  // 8. Optionally call index with isActive=true and verify active rules
  const activeIndexRequest = {
    page: 1 as number & tags.Type<"int32">,
    pageSize,
    search: undefined,
    isActive: true,
    orderBy: undefined,
    orderDirection: undefined,
  } satisfies ICommunityPlatformCommunityRule.IRequest;

  const activePage: IPageICommunityPlatformCommunityRule.ISummary =
    await api.functional.communityPlatform.adminUser.communities.rules.index(
      connection,
      {
        communitySlug: community.slug,
        body: activeIndexRequest,
      },
    );
  typia.assert<IPageICommunityPlatformCommunityRule.ISummary>(activePage);

  const allActive = activePage.data.every((rule) => rule.is_active === true);
  TestValidator.predicate(
    "all rules in active-only listing must have is_active === true",
    allActive,
  );

  const foundActive = activePage.data.find(
    (rule) => rule.id === activeRule.id && rule.version === activeRule.version,
  );
  TestValidator.predicate(
    "active rule created by memberUser should be present in active-only admin listing",
    foundActive !== undefined,
  );

  const inactiveRuleInActivePage = activePage.data.find(
    (rule) => rule.id === inactiveRule.id,
  );
  TestValidator.predicate(
    "inactive rules must not appear in active-only listing",
    inactiveRuleInActivePage === undefined,
  );
}
