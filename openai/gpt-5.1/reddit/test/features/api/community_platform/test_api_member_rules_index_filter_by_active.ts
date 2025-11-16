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
 * Validate that a memberUser can filter community rules by active status.
 *
 * Business workflow:
 *
 * 1. Register a new memberUser via auth.memberUser.join to obtain an authenticated
 *    context (Authorization header is set by the SDK).
 * 2. Create a new community via communityPlatform.memberUser.communities.create
 *    and capture its slug.
 * 3. Within that community, create two rules via
 *    communityPlatform.memberUser.communities.rules.create:
 *
 *    - Rule A: version=1, is_active=true.
 *    - Rule B: version=2, is_active=false.
 * 4. Call communityPlatform.memberUser.communities.rules.index with
 *    ICommunityPlatformCommunityRule.IRequest where isActive=true and a
 *    pageSize large enough to include both rules, asserting that:
 *
 *    - All returned summaries have is_active === true.
 *    - Rule A appears in the list.
 * 5. Call the same index endpoint again with isActive=false and assert that:
 *
 *    - All returned summaries have is_active === false.
 *    - Rule B appears in the list.
 *    - Rule A does not appear in the list.
 */
export async function test_api_member_rules_index_filter_by_active(
  connection: api.IConnection,
) {
  // 1. Register memberUser
  const joinBody = typia.random<ICommunityPlatformMemberuser.IJoin>();
  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorized);

  // 2. Create community
  const communityCreate = typia.random<ICommunityPlatformCommunity.ICreate>();
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreate,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  const communitySlug: string = community.slug;

  // 3. Create two rules in that community
  const ruleATitle = RandomGenerator.paragraph({ sentences: 3 });
  const ruleABody = RandomGenerator.content({ paragraphs: 2 });
  const ruleBTitle = RandomGenerator.paragraph({ sentences: 3 });
  const ruleBBody = RandomGenerator.content({ paragraphs: 2 });

  const ruleACreate = {
    title: ruleATitle,
    body: ruleABody,
    version: 1,
    is_active: true,
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  const ruleA: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.memberUser.communities.rules.create(
      connection,
      {
        communitySlug,
        body: ruleACreate,
      },
    );
  typia.assert<ICommunityPlatformCommunityRule>(ruleA);

  const ruleBCreate = {
    title: ruleBTitle,
    body: ruleBBody,
    version: 2,
    is_active: false,
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  const ruleB: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.memberUser.communities.rules.create(
      connection,
      {
        communitySlug,
        body: ruleBCreate,
      },
    );
  typia.assert<ICommunityPlatformCommunityRule>(ruleB);

  // 4. Index with isActive=true
  const activeRequestBody = {
    page: 1,
    pageSize: 10,
    isActive: true,
  } satisfies ICommunityPlatformCommunityRule.IRequest;

  const activePage: IPageICommunityPlatformCommunityRule.ISummary =
    await api.functional.communityPlatform.memberUser.communities.rules.index(
      connection,
      {
        communitySlug,
        body: activeRequestBody,
      },
    );
  typia.assert<IPageICommunityPlatformCommunityRule.ISummary>(activePage);

  // Assert that all returned summaries are active and belong to the community
  for (const summary of activePage.data) {
    TestValidator.predicate(
      "all active filter results must have is_active === true",
      summary.is_active === true,
    );
    TestValidator.equals(
      "all active summaries must belong to the target community",
      summary.community.slug,
      communitySlug,
    );
  }

  // Ensure Rule A appears in the active list
  const hasRuleAInActive = activePage.data.some(
    (summary) => summary.id === ruleA.id,
  );
  TestValidator.predicate(
    "active-filtered list must contain Rule A (is_active=true)",
    hasRuleAInActive,
  );

  // 5. Index with isActive=false
  const inactiveRequestBody = {
    page: 1,
    pageSize: 10,
    isActive: false,
  } satisfies ICommunityPlatformCommunityRule.IRequest;

  const inactivePage: IPageICommunityPlatformCommunityRule.ISummary =
    await api.functional.communityPlatform.memberUser.communities.rules.index(
      connection,
      {
        communitySlug,
        body: inactiveRequestBody,
      },
    );
  typia.assert<IPageICommunityPlatformCommunityRule.ISummary>(inactivePage);

  for (const summary of inactivePage.data) {
    TestValidator.predicate(
      "all inactive filter results must have is_active === false",
      summary.is_active === false,
    );
    TestValidator.equals(
      "all inactive summaries must belong to the target community",
      summary.community.slug,
      communitySlug,
    );
  }

  const hasRuleBInInactive = inactivePage.data.some(
    (summary) => summary.id === ruleB.id,
  );
  TestValidator.predicate(
    "inactive-filtered list must contain Rule B (is_active=false)",
    hasRuleBInInactive,
  );

  const hasRuleAInInactive = inactivePage.data.some(
    (summary) => summary.id === ruleA.id,
  );
  TestValidator.predicate(
    "inactive-filtered list must not contain Rule A (is_active=true)",
    hasRuleAInInactive === false,
  );
}
