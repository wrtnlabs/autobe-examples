import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_community_admin_paginated_post_list_pagination_behavior(
  connection: api.IConnection,
): Promise<void> {
  // 0. Admin login setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminLogin = await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(adminLogin);
  // 1. Create user to own community
  const userConnection: api.IConnection = { host: connection.host };
  const userJoin = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(userJoin);
  // 2. User creates a community as precondition
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {},
    );
  typia.assert(community);
  const totalPosts = 25;
  // 3. Seed posts with varying postType for pagination - simulate posts creation directly postponed due to no creation API defined in scenario
  // We'll assume posts pre-exist or system seeded for pagination test
  // 4. Test pagination fetching pages with different limits and pages
  // Setup page limit and make multiple page requests
  const pageLimits = [5, 7, 10];
  // Set to test actual pages
  for (const limit of pageLimits) {
    // Calculate total pages
    const totalPages = Math.ceil(totalPosts / limit);
    for (let page = 1; page <= totalPages + 1; ++page) {
      // Request posts page from admin API
      const response =
        await api.functional.communityPlatform.admin.communities.posts.index(
          adminConnection,
          {
            communityId: community.id,
            body: {
              page,
              limit,
            },
          },
        );
      typia.assert(response);
      // Validate pagination info consistency
      TestValidator.equals(
        `pagination.current for limit=${limit} page=${page}`,
        response.pagination.current,
        page,
      );
      TestValidator.equals(
        `pagination.limit for limit=${limit} page=${page}`,
        response.pagination.limit,
        limit,
      );
      TestValidator.equals(
        `pagination.pages for limit=${limit} page=${page}`,
        response.pagination.pages,
        totalPages,
      );
      TestValidator.equals(
        `pagination.records for limit=${limit} page=${page}`,
        response.pagination.records,
        totalPosts,
      );
      if (page <= totalPages) {
        const expectedCount =
          page < totalPages ? limit : totalPosts - limit * (totalPages - 1);
        TestValidator.equals(
          `number of posts returned for limit=${limit} page=${page}`,
          response.data.length,
          expectedCount,
        );
        // Each data post should be valid
        for (const post of response.data) {
          typia.assert(post);
          TestValidator.predicate(
            `post.id string check for limit=${limit} page=${page}`,
            typeof post.id === "string",
          );
          TestValidator.predicate(
            `post.title string check for limit=${limit} page=${page}`,
            typeof post.title === "string",
          );
          TestValidator.predicate(
            `post.postType string check for limit=${limit} page=${page}`,
            typeof post.postType === "string",
          );
        }
      } else {
        // Beyond last page: no data returned
        TestValidator.equals(
          `empty data for limit=${limit} page=${page}`,
          response.data.length,
          0,
        );
      }
    }
  }
}
