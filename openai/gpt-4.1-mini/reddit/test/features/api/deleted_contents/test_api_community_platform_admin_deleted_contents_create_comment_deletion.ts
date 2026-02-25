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

export async function test_api_community_platform_admin_deleted_contents_create_comment_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin user registration for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {});
  adminConnection.headers = {
    ...(adminConnection.headers ?? {}),
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Prepare the deletion record creation data for a comment
  const commentId = typia.random<string & tags.Format<"uuid">>();
  const moderatorId = adminAuthorized.id;
  const userId = typia.random<string & tags.Format<"uuid">>();
  const reason = "Violation of community guidelines";
  const body: ICommunityPlatformDeletedContent.ICreate = {
    moderator_id: moderatorId,
    user_id: userId,
    comment_id: commentId,
    post_id: null,
    reason: reason,
  };
  // 3. Create the deletion record via the utility function
  const deletedContent =
    await generate_random_community_platform_admin_deleted_contents_create_deleted_content(
      adminConnection,
      {
        body,
      },
    );
  // 4. Assert the response type and mandatory fields
  typia.assert(deletedContent);
  // Validate that the returned record contains the expected fields
  TestValidator.equals(
    "moderator ID",
    deletedContent.moderator_id,
    moderatorId,
  );
  TestValidator.equals("user ID", deletedContent.user_id, userId);
  TestValidator.equals("comment ID", deletedContent.comment_id, commentId);
  TestValidator.equals("post ID", deletedContent.post_id ?? null, null);
  TestValidator.equals("reason", deletedContent.reason, reason);
  // 5. Validate nested moderator and user summary if available
  if (
    deletedContent.moderator !== undefined &&
    deletedContent.moderator !== null
  ) {
    typia.assert(deletedContent.moderator);
  }
  if (deletedContent.user !== undefined && deletedContent.user !== null) {
    typia.assert(deletedContent.user);
  }
}
