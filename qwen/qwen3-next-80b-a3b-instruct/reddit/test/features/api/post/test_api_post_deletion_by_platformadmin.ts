import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";

export async function test_api_post_deletion_by_platformadmin(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Platform administrator successfully deletes a post in any community
  // 1. Join as a platform admin to obtain authentication token
  // 2. Delete a post using platform admin privileges (post ID is assumed to exist in test environment)
  // 3. Validate that the deleted post object is returned with all expected fields
  // 1. Authenticate as platform admin
  const adminConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_platform_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditCommunityPlatformAdmin.IJoin,
  });
  typia.assert(authResponse);
  // 2. Delete a post using a randomly generated valid UUID (assumed to exist in test environment)
  const postId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const deletedPost =
    await api.functional.redditCommunity.platformAdmin.posts.erase(
      adminConnection,
      { postId },
    );
  typia.assert(deletedPost);
  // 3. Validate the returned post object has the full structure of IRedditCommunityPost
  TestValidator.equals("post id matches", deletedPost.id, postId);
  TestValidator.predicate(
    "post title exists and is string",
    typeof deletedPost.title === "string",
  );
  TestValidator.predicate(
    "post content is one of IContentText, IContentUrl, IContentImageUrl",
    typeof deletedPost.content === "string" ||
      (typeof deletedPost.content === "object" &&
        deletedPost.content.url !== undefined),
  );
  TestValidator.equals(
    "post author is summary",
    deletedPost.author.id !== undefined,
    true,
  );
  TestValidator.equals(
    "post author display_name exists",
    deletedPost.author.display_name !== undefined,
    true,
  );
  TestValidator.equals(
    "post community is summary",
    deletedPost.community.id !== undefined,
    true,
  );
  TestValidator.equals(
    "post community name exists",
    deletedPost.community.name !== undefined,
    true,
  );
  TestValidator.predicate(
    "post vote_score is int32",
    Number.isInteger(deletedPost.vote_score),
  );
  TestValidator.predicate(
    "post comments_count is int32",
    Number.isInteger(deletedPost.comments_count),
  );
  TestValidator.equals(
    "post created_at is ISO date-time",
    deletedPost.created_at.length > 0,
    true,
  );
  TestValidator.equals(
    "post updated_at is ISO date-time",
    deletedPost.updated_at.length > 0,
    true,
  );
  TestValidator.equals(
    "post status is one of 'active', 'deleted', 'banned'",
    ["active", "deleted", "banned"].includes(deletedPost.status),
    true,
  );
  TestValidator.predicate(
    "post karma_score is int32",
    Number.isInteger(deletedPost.karma_score),
  );
  TestValidator.equals(
    "post deleted_at is null or date-time",
    deletedPost.deleted_at === null ||
      (typeof deletedPost.deleted_at === "string" &&
        deletedPost.deleted_at.length > 0),
    true,
  );
}