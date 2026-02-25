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

export async function test_api_community_admin_filtered_post_list_by_type_sort_time(
  connection: api.IConnection,
) {
  // Admin login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    bio: null,
    avatarUrl: null,
  } satisfies ICommunityPlatformAdmin.IJoin;
  const admin = await authorize_admin_join(adminConnection, {
    body: adminJoinBody,
  });
  // Use admin token connection for subsequent admin operations
  adminConnection.headers = {
    Authorization: admin.token.access,
  };
  // User join and login
  const userConnection: api.IConnection = { host: connection.host };
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies ICommunityPlatformUser.IJoin;
  const user = await authorize_user_join(userConnection, {
    body: userJoinBody,
  });
  userConnection.headers = {
    Authorization: user.token.access,
  };
  // Create community by user
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {},
    );
  // Create posts with various types and timestamps
  // Because test requires posts with time range filtering, we create posts with createdAt adjusted accordingly by manipulating createdAt values if possible
  // But since post creation API is not specified, we will simulate posts creation by calling the admin posts index endpoint to verify filtering
  // Instead, we simulate the retrieval with filtered post types etc.
  // Define filters
  const postTypes = ["text", "link", "image"] as const;
  const sortingModes = ["new", "hot", "top"] as const;
  const timeRanges = ["day", "week", "month"] as const;
  // Pagination parameters
  const page = 1;
  const limit = 10;
  // We will perform multiple queries for each combination of filters
  for (const postType of postTypes) {
    for (const sortingMode of sortingModes) {
      for (const timeRange of timeRanges) {
        // Prepare request body
        const body: ICommunityPlatformPost.IRequest = {
          postType,
          sortingMode,
          timeRange,
          page,
          limit,
        };
        // Query filtered posts from admin perspective
        const result =
          await api.functional.communityPlatform.admin.communities.posts.index(
            adminConnection,
            {
              communityId: community.id,
              body,
            },
          );
        typia.assert(result);
        // Validate all posts match filter criteria
        for (const post of result.data) {
          // Check post type
          TestValidator.predicate(
            `post type is ${postType}`,
            post.postType === postType,
          );
          // Check post createdAt is within time range
          const createdAt = new Date(post.createdAt);
          const now = new Date();
          let cutoff = new Date(now);
          switch (timeRange) {
            case "day":
              cutoff.setDate(cutoff.getDate() - 1);
              break;
            case "week":
              cutoff.setDate(cutoff.getDate() - 7);
              break;
            case "month":
              cutoff.setMonth(cutoff.getMonth() - 1);
              break;
          }
          TestValidator.predicate(
            `post createdAt within ${timeRange}`,
            createdAt >= cutoff && createdAt <= now,
          );
        }
        // Validate sorting order
        const dates = result.data.map((p) => new Date(p.createdAt).getTime());
        if (sortingMode === "new") {
          // Descending order of createdAt
          for (let i = 0; i + 1 < dates.length; i++) {
            TestValidator.predicate(
              "sorted by new descending",
              dates[i] >= dates[i + 1],
            );
          }
        } else if (sortingMode === "top") {
          const scores = result.data.map((p) => p.voteScore);
          for (let i = 0; i + 1 < scores.length; i++) {
            TestValidator.predicate(
              "sorted by top descending",
              scores[i] >= scores[i + 1],
            );
          }
        } else if (sortingMode === "hot") {
          // Simple hot sorting roughly by recency (createdAt desc) and votes
          // Validated as createdAt descending as a proxy
          for (let i = 0; i + 1 < dates.length; i++) {
            TestValidator.predicate(
              "sorted by hot descending",
              dates[i] >= dates[i + 1],
            );
          }
        }
        // Validate pagination
        TestValidator.predicate(
          "pagination page correct",
          result.pagination.current === page,
        );
        TestValidator.predicate(
          "pagination limit correct",
          result.pagination.limit === limit,
        );
        TestValidator.predicate(
          "pagination records positive",
          result.pagination.records >= 0,
        );
        TestValidator.predicate(
          "pagination pages correct",
          result.pagination.pages >= 0,
        );
      }
    }
  }
}
