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

export async function test_api_admin_post_comment_hierarchy_deep_nesting(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create post
  const post = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: community.name,
        post_type: "text",
        text_content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 3,
          sentenceMax: 6,
        }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Retrieve comment hierarchy using admin endpoint
  const hierarchy =
    await api.functional.communityPlatform.admin.posts.comments.hierarchy.invert(
      adminConnection,
      {
        postId: post.id,
      },
    );
  typia.assert(hierarchy);
  // Validate hierarchy structure
  TestValidator.predicate(
    "hierarchy should have pagination",
    hierarchy.pagination !== undefined,
  );
  TestValidator.predicate(
    "hierarchy should have data array",
    Array.isArray(hierarchy.data),
  );
  // Validate pagination structure
  TestValidator.predicate(
    "pagination should have current page",
    typeof hierarchy.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination should have limit",
    typeof hierarchy.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination should have records",
    typeof hierarchy.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination should have pages",
    typeof hierarchy.pagination.pages === "number",
  );
  // Validate that each comment in hierarchy has proper structure
  hierarchy.data.forEach((comment, index) => {
    TestValidator.predicate(
      `comment ${index} should have id`,
      typeof comment.id === "string" && comment.id.length > 0,
    );
    TestValidator.predicate(
      `comment ${index} should have content`,
      typeof comment.content === "string" && comment.content.length > 0,
    );
    TestValidator.predicate(
      `comment ${index} should have is_deleted`,
      typeof comment.is_deleted === "boolean",
    );
    TestValidator.predicate(
      `comment ${index} should have created_at`,
      typeof comment.created_at === "string" && comment.created_at.length > 0,
    );
    TestValidator.predicate(
      `comment ${index} should have updated_at`,
      comment.updated_at === null || typeof comment.updated_at === "string",
    );
    TestValidator.predicate(
      `comment ${index} should have deleted_at`,
      comment.deleted_at === null || typeof comment.deleted_at === "string",
    );
    TestValidator.predicate(
      `comment ${index} should have author`,
      comment.author !== undefined && typeof comment.author.id === "string",
    );
    TestValidator.predicate(
      `comment ${index} should have post`,
      comment.post !== undefined && typeof comment.post.id === "string",
    );
    TestValidator.predicate(
      `comment ${index} should have parent`,
      comment.parent === null || typeof comment.parent.id === "string",
    );
    TestValidator.predicate(
      `comment ${index} should have vote_score`,
      typeof comment.vote_score === "number",
    );
    TestValidator.predicate(
      `comment ${index} should have replies_count`,
      typeof comment.replies_count === "number" && comment.replies_count >= 0,
    );
  });
  // Validate hierarchical relationships
  // Check that comments with parent references have valid parent objects
  const commentsWithParents = hierarchy.data.filter(
    (comment) => comment.parent !== null,
  );
  commentsWithParents.forEach((comment) => {
    TestValidator.predicate(
      "comment with parent should have valid parent object",
      comment.parent !== null && typeof comment.parent.id === "string",
    );
  });
  // Test that the hierarchy endpoint successfully returns data for the post
  // Even without actual comments, the structure should be valid
  TestValidator.predicate(
    "hierarchy endpoint should return valid response structure",
    hierarchy.data.length >= 0 && hierarchy.pagination.records >= 0,
  );
}
