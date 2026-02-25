import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
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
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_admin_comment_sorted_empty_comments(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: null,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create post
  const post = await generate_random_community_platform_user_posts_create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Test default sorting (should be empty)
  const defaultComments =
    await api.functional.communityPlatform.admin.posts.comments.sorted.index(
      adminConnection,
      {
        postId: post.id,
        body: {
          sort: undefined,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(defaultComments);
  // Verify empty data array
  TestValidator.equals("empty comments data array", defaultComments.data, []);
  TestValidator.equals("zero records", defaultComments.pagination.records, 0);
  TestValidator.equals("zero pages", defaultComments.pagination.pages, 0);
  TestValidator.equals("current page 1", defaultComments.pagination.current, 1);
  TestValidator.equals("limit matches", defaultComments.pagination.limit, 10);
  // Test 'best' sorting
  const bestComments =
    await api.functional.communityPlatform.admin.posts.comments.sorted.index(
      adminConnection,
      {
        postId: post.id,
        body: {
          sort: "best",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(bestComments);
  TestValidator.equals("best sorting empty data", bestComments.data, []);
  TestValidator.equals(
    "best sorting zero records",
    bestComments.pagination.records,
    0,
  );
  // Test 'new' sorting
  const newComments =
    await api.functional.communityPlatform.admin.posts.comments.sorted.index(
      adminConnection,
      {
        postId: post.id,
        body: {
          sort: "new",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(newComments);
  TestValidator.equals("new sorting empty data", newComments.data, []);
  TestValidator.equals(
    "new sorting zero records",
    newComments.pagination.records,
    0,
  );
  // Test 'controversial' sorting
  const controversialComments =
    await api.functional.communityPlatform.admin.posts.comments.sorted.index(
      adminConnection,
      {
        postId: post.id,
        body: {
          sort: "controversial",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(controversialComments);
  TestValidator.equals(
    "controversial sorting empty data",
    controversialComments.data,
    [],
  );
  TestValidator.equals(
    "controversial sorting zero records",
    controversialComments.pagination.records,
    0,
  );
  // Test pagination with different page
  const page2Comments =
    await api.functional.communityPlatform.admin.posts.comments.sorted.index(
      adminConnection,
      {
        postId: post.id,
        body: {
          sort: "new",
          page: 2,
          limit: 5,
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(page2Comments);
  TestValidator.equals("page 2 empty data", page2Comments.data, []);
  TestValidator.equals(
    "page 2 zero records",
    page2Comments.pagination.records,
    0,
  );
  TestValidator.equals(
    "page 2 current page",
    page2Comments.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", page2Comments.pagination.limit, 5);
}
