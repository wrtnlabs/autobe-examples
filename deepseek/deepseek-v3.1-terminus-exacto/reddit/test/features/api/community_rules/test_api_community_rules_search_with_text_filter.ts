import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityRule";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_moderator_communities_rules_create } from "../../../generate/generate_random_community_platform_moderator_communities_rules_create";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_rule } from "../../../prepare/prepare_random_community_platform_community_rule";

export async function test_api_community_rules_search_with_text_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. User actor setup - create and login
  const userConnection: api.IConnection = { host: connection.host };
  const userJoinResult = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(12),
    },
  });
  typia.assert(userJoinResult);
  // Login to get token set in headers
  const userLoginResult = await authorize_user_login(userConnection, {
    body: {
      email: userJoinResult.email,
      password: "12345678" satisfies string & tags.Format<"password">,
    } satisfies ICommunityPlatformUser.ILogin,
  });
  typia.assert(userLoginResult);
  // 2. Create a community as user
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Moderator actor setup - create and login
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoinResult = await authorize_moderator_join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.alphabets(8),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(moderatorJoinResult);
  const moderatorLoginResult = await authorize_moderator_login(
    moderatorConnection,
    {
      body: {
        email: moderatorJoinResult.email,
        password: "12345678" satisfies string & tags.Format<"password">,
      } satisfies ICommunityPlatformModerator.ILogin,
    },
  );
  typia.assert(moderatorLoginResult);
  // 4. Create multiple rules with specific keywords for search testing
  const rules: ICommunityPlatformCommunityRule[] = [];
  const ruleTexts = [
    "PROHIBITED content includes hate speech.",
    "Allowed content must be respectful.",
    "Spam is not allowed in this community.",
    "Prohibited behavior includes harassment.",
    "All members are allowed to post questions.",
    "No spam or advertisements.",
  ];
  for (let i = 0; i < ruleTexts.length; i++) {
    const rule =
      await generate_random_community_platform_moderator_communities_rules_create(
        moderatorConnection,
        {
          params: { communityId: community.id },
          body: {
            rule_text: ruleTexts[i],
            rule_order: i + 1,
            is_active: true,
          } satisfies ICommunityPlatformCommunityRule.ICreate,
        },
      );
    typia.assert(rule);
    rules.push(rule);
  }
  // 5. Test search functionality with text filtering
  // Since the search endpoint returns ISummary objects without rule_text,
  // we need to validate search results differently
  // 5a) Search for "prohibited" (case-insensitive)
  const searchResult1 =
    await api.functional.communityPlatform.communities.rules.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          search: "prohibited",
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformCommunityRule.IRequest,
      },
    );
  typia.assert(searchResult1);
  // Validate results contain only rules with "prohibited" by checking against original rules
  const expectedProhibitedIds = rules
    .filter((r) => r.rule_text.toLowerCase().includes("prohibited"))
    .map((r) => r.id);
  TestValidator.equals(
    "prohibited search returns matching rules",
    searchResult1.data.length,
    expectedProhibitedIds.length,
  );
  // Verify all returned rule IDs match the expected prohibited rules
  for (const ruleSummary of searchResult1.data) {
    TestValidator.predicate(
      `rule ${ruleSummary.id} is in expected prohibited rules`,
      expectedProhibitedIds.includes(ruleSummary.id),
    );
  }
  // 5b) Search for "ALLOWED" (uppercase to test case-insensitive)
  const searchResult2 =
    await api.functional.communityPlatform.communities.rules.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          search: "ALLOWED",
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformCommunityRule.IRequest,
      },
    );
  typia.assert(searchResult2);
  const expectedAllowedIds = rules
    .filter((r) => r.rule_text.toLowerCase().includes("allowed"))
    .map((r) => r.id);
  TestValidator.equals(
    "ALLOWED uppercase search returns matching rules",
    searchResult2.data.length,
    expectedAllowedIds.length,
  );
  for (const ruleSummary of searchResult2.data) {
    TestValidator.predicate(
      `rule ${ruleSummary.id} is in expected allowed rules`,
      expectedAllowedIds.includes(ruleSummary.id),
    );
  }
  // 5c) Search for partial match "sp" (should match "spam")
  const searchResult3 =
    await api.functional.communityPlatform.communities.rules.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          search: "sp",
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformCommunityRule.IRequest,
      },
    );
  typia.assert(searchResult3);
  const expectedSpIds = rules
    .filter((r) => r.rule_text.toLowerCase().includes("spam"))
    .map((r) => r.id);
  TestValidator.equals(
    "partial search 'sp' returns rules with 'spam'",
    searchResult3.data.length,
    expectedSpIds.length,
  );
  // 5d) Test pagination with limit
  const searchResult4 =
    await api.functional.communityPlatform.communities.rules.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          search: "", // empty search returns all
          limit: 3,
          page: 1,
        } satisfies ICommunityPlatformCommunityRule.IRequest,
      },
    );
  typia.assert(searchResult4);
  TestValidator.equals("pagination limit works", searchResult4.data.length, 3);
  TestValidator.predicate(
    "pagination metadata present",
    searchResult4.pagination !== undefined,
  );
  TestValidator.equals(
    "current page is 1",
    searchResult4.pagination.current,
    1 satisfies number as number,
  );
  TestValidator.equals(
    "limit matches request",
    searchResult4.pagination.limit,
    3 satisfies number as number,
  );
  TestValidator.predicate(
    "records count includes all rules",
    searchResult4.pagination.records >= rules.length,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    searchResult4.pagination.pages ===
      Math.ceil(searchResult4.pagination.records / 3),
  );
  // 5e) Verify no rules from other communities are included
  // Create another community
  const otherCommunity =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10) + "_other",
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(otherCommunity);
  // Create a rule in other community with searchable term
  const otherRule =
    await generate_random_community_platform_moderator_communities_rules_create(
      moderatorConnection,
      {
        params: { communityId: otherCommunity.id },
        body: {
          rule_text: "This PROHIBITED rule is in another community.",
          rule_order: 1,
          is_active: true,
        } satisfies ICommunityPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(otherRule);
  // Search again in original community - should not include other community's rule
  const searchResult5 =
    await api.functional.communityPlatform.communities.rules.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          search: "PROHIBITED",
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformCommunityRule.IRequest,
      },
    );
  typia.assert(searchResult5);
  // Verify none of the returned rules have the other community's rule ID
  for (const ruleSummary of searchResult5.data) {
    TestValidator.notEquals(
      `rule ${ruleSummary.id} is not from other community`,
      ruleSummary.id,
      otherRule.id,
    );
  }
}
