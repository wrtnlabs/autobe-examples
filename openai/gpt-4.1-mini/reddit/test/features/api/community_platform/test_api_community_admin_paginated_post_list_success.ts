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

export async function test_api_community_admin_paginated_post_list_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin account setup and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_admin_join(adminConnection, {
    body: {
      email: `admin+${typia.random<string & tags.Format<"email">>()}`,
      password: "strongPassword123!",
      displayName: "Admin User",
      bio: null,
      avatarUrl: null,
    },
  });
  typia.assert(adminJoinResult);
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoinResult.email,
      password: "strongPassword123!",
    },
  });
  // 2. User account setup and login
  const userConnection: api.IConnection = { host: connection.host };
  const userJoinResult = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "userPassword123!",
      username: typia.random<string & tags.Format<"email">>().split("@")[0],
      displayName: "User DisplayName",
      href: "https://localhost/example",
      referrer: "https://localhost/referrer",
      ip: null,
    },
  });
  typia.assert(userJoinResult);
  await authorize_user_login(userConnection, {
    body: {
      email: userJoinResult.email,
      password: "userPassword123!",
    },
  });
  // 3. User creates a community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {},
    );
  typia.assert(community);
  // 4. Admin retrieves the paginated list of posts in the community with default pagination and no filters
  const paginatedPosts =
    await api.functional.communityPlatform.admin.communities.posts.index(
      adminConnection,
      {
        communityId: community.id,
        body: {}, // No filters, default pagination
      },
    );
  typia.assert(paginatedPosts);
  // 5. Validate pagination info
  TestValidator.predicate(
    "pagination current page is at least 1",
    paginatedPosts.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    paginatedPosts.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    paginatedPosts.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    paginatedPosts.pagination.pages >= 0,
  );
  // 6. Validate each post item
  for (const post of paginatedPosts.data) {
    typia.assert(post);
    // Must belong to the requested community
    TestValidator.equals(
      "post community ID matches",
      post.community.id,
      community.id,
    );
    // Validate required fields
    TestValidator.predicate("post title is non-empty", post.title.length > 0);
    TestValidator.predicate(
      "post type is valid",
      ["text", "link", "image"].includes(post.postType),
    );
    TestValidator.predicate(
      "vote score is a number",
      typeof post.voteScore === "number",
    );
    TestValidator.predicate(
      "comment count is a number",
      typeof post.commentCount === "number",
    );
    // Validate timestamp strings
    TestValidator.predicate(
      "createdAt is ISO date-time string",
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/.test(post.createdAt),
    );
    TestValidator.predicate(
      "updatedAt is ISO date-time string",
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/.test(post.updatedAt),
    );
    // DeletedAt can be null or ISO date-time string
    if (post.deletedAt !== null) {
      TestValidator.predicate(
        "deletedAt is ISO date-time string when not null",
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/.test(post.deletedAt),
      );
    }
    // Validate that author is either user or moderator, not both
    TestValidator.predicate(
      "authorUser or authorModerator must be present",
      (post.authorUser !== null && post.authorUser !== undefined) !==
        (post.authorModerator !== null && post.authorModerator !== undefined),
    );
    // If authorUser exists, validate email and id
    if (post.authorUser) {
      typia.assert(post.authorUser);
      TestValidator.predicate(
        "authorUser email contains @",
        post.authorUser.email.includes("@"),
      );
      TestValidator.predicate(
        "authorUser id is UUID",
        /[0-9a-fA-F-]{36}/.test(post.authorUser.id),
      );
    }
    // If authorModerator exists, validate that it is object but omit property checks
    if (post.authorModerator) {
      typia.assert(post.authorModerator);
      // Since ICommunityPlatformModerator.ISummary has no properties, no property validation for displayName or id
    }
  }
}
