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

export async function test_api_community_rules_pagination_with_large_dataset(
  connection: api.IConnection,
): Promise<void> {
  // Create user actor connection
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userAuth);
  // Create moderator actor connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderatorAuth);
  // Create a community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create 15 rules to exceed single page limit
  const totalRules = 15;
  const rules: ICommunityPlatformCommunityRule[] = [];
  for (let i = 1; i <= totalRules; i++) {
    const rule =
      await generate_random_community_platform_moderator_communities_rules_create(
        moderatorConnection,
        {
          body: {
            rule_text: RandomGenerator.paragraph({ sentences: 2 }),
            rule_order: i,
            is_active: true,
          } satisfies ICommunityPlatformCommunityRule.ICreate,
          params: {
            communityId: community.id,
          },
        },
      );
    typia.assert(rule);
    rules.push(rule);
  }
  // Test pagination with different page sizes
  const pageLimits = [5, 10, 15] as const;
  for (const limit of pageLimits) {
    const totalPages = Math.ceil(totalRules / limit);
    // Test each page
    for (let page = 1; page <= totalPages; page++) {
      const response =
        await api.functional.communityPlatform.communities.rules.index(
          moderatorConnection,
          {
            communityId: community.id,
            body: {
              page: page satisfies number &
                tags.Type<"int32"> &
                tags.Minimum<1>,
              limit: limit satisfies number &
                tags.Type<"int32"> &
                tags.Minimum<1> &
                tags.Maximum<100>,
            } satisfies ICommunityPlatformCommunityRule.IRequest,
          },
        );
      typia.assert(response);
      // Validate pagination metadata
      TestValidator.equals(
        `page ${page} limit ${limit} current page`,
        response.pagination.current,
        page,
      );
      TestValidator.equals(
        `page ${page} limit ${limit} page limit`,
        response.pagination.limit,
        limit,
      );
      TestValidator.equals(
        `page ${page} limit ${limit} total records`,
        response.pagination.records,
        totalRules,
      );
      TestValidator.equals(
        `page ${page} limit ${limit} total pages`,
        response.pagination.pages,
        totalPages,
      );
      // Validate data count
      const expectedCount =
        page === totalPages ? totalRules - (totalPages - 1) * limit : limit;
      TestValidator.equals(
        `page ${page} limit ${limit} data count`,
        response.data.length,
        expectedCount,
      );
      // Validate rule ordering
      const expectedStartIndex = (page - 1) * limit;
      const expectedEndIndex = Math.min(expectedStartIndex + limit, totalRules);
      for (let i = 0; i < response.data.length; i++) {
        const expectedRuleIndex = expectedStartIndex + i;
        TestValidator.equals(
          `page ${page} limit ${limit} rule ${i} order`,
          response.data[i].rule_order,
          expectedRuleIndex + 1,
        );
      }
    }
    // Test edge case: page beyond total pages
    const beyondPage = totalPages + 1;
    const beyondResponse =
      await api.functional.communityPlatform.communities.rules.index(
        moderatorConnection,
        {
          communityId: community.id,
          body: {
            page: beyondPage satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<1>,
            limit: limit satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
          } satisfies ICommunityPlatformCommunityRule.IRequest,
        },
      );
    typia.assert(beyondResponse);
    // Should return empty data for page beyond total
    TestValidator.equals(
      `beyond page ${beyondPage} limit ${limit} data count`,
      beyondResponse.data.length,
      0,
    );
    TestValidator.equals(
      `beyond page ${beyondPage} limit ${limit} current page`,
      beyondResponse.pagination.current,
      beyondPage,
    );
    TestValidator.equals(
      `beyond page ${beyondPage} limit ${limit} total records`,
      beyondResponse.pagination.records,
      totalRules,
    );
    TestValidator.equals(
      `beyond page ${beyondPage} limit ${limit} total pages`,
      beyondResponse.pagination.pages,
      totalPages,
    );
  }
  // Test default pagination (no page/limit specified)
  const defaultResponse =
    await api.functional.communityPlatform.communities.rules.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {} satisfies ICommunityPlatformCommunityRule.IRequest,
      },
    );
  typia.assert(defaultResponse);
  // Should return all rules with default pagination
  TestValidator.equals(
    "default pagination data count",
    defaultResponse.data.length,
    totalRules,
  );
  TestValidator.equals(
    "default pagination current page",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "default pagination total records",
    defaultResponse.pagination.records,
    totalRules,
  );
  // Verify all rules are returned in correct order
  for (let i = 0; i < defaultResponse.data.length; i++) {
    TestValidator.equals(
      `default pagination rule ${i} order`,
      defaultResponse.data[i].rule_order,
      i + 1,
    );
  }
}
