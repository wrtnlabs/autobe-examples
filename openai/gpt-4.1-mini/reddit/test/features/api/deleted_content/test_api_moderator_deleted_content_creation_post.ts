import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_community_platform_moderator_deleted_contents_create_deleted_content } from "../../../generate/generate_random_community_platform_moderator_deleted_contents_create_deleted_content";
import { prepare_random_community_platform_deleted_content } from "../../../prepare/prepare_random_community_platform_deleted_content";

export async function test_api_moderator_deleted_content_creation_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator join and authorize
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await authorize_moderator_join(moderatorJoinConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(1),
        displayName: null,
        bio: null,
        avatarUrl: null,
      },
    });
  typia.assert(moderator);
  // Create new moderatorConnection with authorization header
  const moderatorConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: moderator.token.access },
  };
  // 2. Prepare deletion content create request
  // Use utility function to generate random creation data with exactly post_id set and comment_id null
  const postId = typia.random<string & tags.Format<"uuid">>();
  const userId = typia.random<string & tags.Format<"uuid">>();
  const reason = RandomGenerator.paragraph({ sentences: 2 });
  // Because we directly test creation, prepare body explicitly
  const body: ICommunityPlatformDeletedContent.ICreate = {
    moderator_id: moderator.id,
    user_id: userId,
    post_id: postId,
    comment_id: null,
    reason: reason,
  };
  // 3. Call createDeletedContent via utility function
  const deletedContent =
    await generate_random_community_platform_moderator_deleted_contents_create_deleted_content(
      moderatorConnection,
      {
        body: body,
      },
    );
  typia.assert(deletedContent);
  // 4. Validate returned deletion record
  // moderator info and user info should exist or be nullable as per DTO
  TestValidator.equals(
    "moderator_id matches",
    deletedContent.moderator_id,
    moderator.id,
  );
  TestValidator.equals("user_id matches", deletedContent.user_id, userId);
  TestValidator.equals("post_id matches", deletedContent.post_id, postId);
  TestValidator.equals("comment_id is null", deletedContent.comment_id, null);
  TestValidator.equals("reason matches", deletedContent.reason, reason);
  // timestamps present
  TestValidator.predicate(
    "created_at exists",
    typeof deletedContent.created_at === "string" &&
      deletedContent.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at exists",
    typeof deletedContent.updated_at === "string" &&
      deletedContent.updated_at.length > 0,
  );
  // Relations post and comment: post should be non-null and comment null
  TestValidator.predicate("post summary present", deletedContent.post !== null);
  TestValidator.predicate(
    "comment summary is null",
    deletedContent.comment === null,
  );
  // Authorization is enforced by the use of moderator authorization before calling creation
}
