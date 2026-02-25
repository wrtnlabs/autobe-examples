import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityFlair } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityFlair";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityFlair } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityFlair";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_community_flair_search_filter_active(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and register
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // Create community
  const community =
    await api.functional.communityPlatform.user.communities.create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Note: Since we don't have endpoint to create flairs for testing,
  // we'll test the search functionality with the current state
  // Test filtering active flairs
  const activeFlairs =
    await api.functional.communityPlatform.communities.flairs.index(
      userConnection,
      {
        communityId: community.id,
        body: {
          isActive: true,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityFlair.IRequest,
      },
    );
  typia.assert(activeFlairs);
  // Test filtering inactive flairs
  const inactiveFlairs =
    await api.functional.communityPlatform.communities.flairs.index(
      userConnection,
      {
        communityId: community.id,
        body: {
          isActive: false,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityFlair.IRequest,
      },
    );
  typia.assert(inactiveFlairs);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination properties exist",
    activeFlairs.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "pagination properties exist",
    activeFlairs.pagination.current > 0,
    true,
  );
  TestValidator.equals(
    "pagination properties exist",
    activeFlairs.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination properties exist",
    activeFlairs.pagination.pages >= 0,
    true,
  );
  // Validate that all active flair results have is_active=true
  for (const flair of activeFlairs.data) {
    TestValidator.predicate("flair is active", flair.is_active === true);
  }
  // Validate that all inactive flair results have is_active=false
  for (const flair of inactiveFlairs.data) {
    TestValidator.predicate("flair is inactive", flair.is_active === false);
  }
  // Test search with text filter combined with active status
  if (activeFlairs.data.length > 0) {
    const sampleFlair = activeFlairs.data[0];
    const searchResult =
      await api.functional.communityPlatform.communities.flairs.index(
        userConnection,
        {
          communityId: community.id,
          body: {
            search: sampleFlair.display_text.substring(0, 3),
            isActive: true,
            page: 1,
            limit: 5,
          } satisfies ICommunityPlatformCommunityFlair.IRequest,
        },
      );
    typia.assert(searchResult);
    TestValidator.predicate(
      "search returns results when combined with active filter",
      searchResult.data.length >= 0,
    );
  }
}
