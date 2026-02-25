import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformDeletedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDeletedContent";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostComment";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_deleted_contents_create_deleted_content } from "../../../generate/generate_random_community_platform_admin_deleted_contents_create_deleted_content";
import { prepare_random_community_platform_deleted_content } from "../../../prepare/prepare_random_community_platform_deleted_content";

/**
 * Test creating a deletion record when an admin deletes a post.
 * This test verifies that an authorized admin user can successfully create a deletion audit record
 * for a deleted post, including the moderator and user relationships and reason for deletion.
 * Authorization is ensured to restrict operation to admins only.
 */
export async function test_api_community_platform_admin_deleted_contents_create_post_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authorize admin user
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: `admin+${RandomGenerator.alphaNumeric(8)}@test.com`,
        password: "securepassword123",
        displayName: RandomGenerator.name(1),
        bio: null,
        avatarUrl: null,
      },
    });
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = adminAuthorized.token.access;
  // Prepare a deletion record creation input for a post
  // We must generate realistic IDs to simulate a post deletion.
  // We'll generate random UUID strings for moderator_id, user_id, and post_id.
  // Generate moderator_id as the admin's id
  const moderatorId = adminAuthorized.id;
  // Generate user_id and post_id (simulate realistic UUIDs)
  const userId = typia.random<string & typia.tags.Format<"uuid">>();
  const postId = typia.random<string & typia.tags.Format<"uuid">>();
  const reason = RandomGenerator.paragraph({ sentences: 2 });
  const createBody: ICommunityPlatformDeletedContent.ICreate = {
    moderator_id: moderatorId,
    user_id: userId,
    post_id: postId,
    comment_id: null,
    reason: reason,
  };
  // 2. Call the endpoint to create deletion record for the post using utility
  const deletionRecord: ICommunityPlatformDeletedContent =
    await generate_random_community_platform_admin_deleted_contents_create_deleted_content(
      adminConnection,
      { body: createBody },
    );
  // 3. Assert response type
  typia.assert(deletionRecord);
  // 4. Validate properties
  TestValidator.equals(
    "moderator_id matches",
    deletionRecord.moderator_id,
    moderatorId,
  );
  TestValidator.equals("user_id matches", deletionRecord.user_id, userId);
  TestValidator.equals("post_id matches", deletionRecord.post_id, postId);
  TestValidator.equals("comment_id is null", deletionRecord.comment_id, null);
  TestValidator.equals("reason matches", deletionRecord.reason, reason);
  // 5. Validate relational summaries
  TestValidator.predicate(
    "moderator summary exists",
    deletionRecord.moderator !== undefined && deletionRecord.moderator !== null,
  );
  TestValidator.predicate(
    "user summary exists",
    deletionRecord.user !== undefined && deletionRecord.user !== null,
  );
  TestValidator.predicate(
    "deleted post summary exists",
    deletionRecord.post !== undefined && deletionRecord.post !== null,
  );
  TestValidator.equals(
    "deleted comment summary is null",
    deletionRecord.comment,
    null,
  );
  // 6. Authorization check: Try to create deletion record without admin authorization
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  // Attempt to create deletion record without auth should fail
  await TestValidator.error("unauthorized deletion create", async () => {
    await generate_random_community_platform_admin_deleted_contents_create_deleted_content(
      unauthorizedConnection,
      { body: createBody },
    );
  });
}
