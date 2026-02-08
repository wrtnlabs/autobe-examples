import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
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
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_comments_create } from "../../../generate/generate_random_community_platform_user_comments_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";

/**
 * Test updating community platform comment authorization and content.
 *
 * Covers:
 *  - Comment update by original author
 *  - Unauthorized update by non-owner user
 *  - Comment update by authorized moderator
 */
export async function test_api_community_platform_comment_update_authorization_and_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. User A joins and authenticates
  const userAConnection: api.IConnection = { host: connection.host };
  const userAJoin = await authorize_user_join(userAConnection, { body: {} });
  typia.assert(userAJoin);
  userAConnection.headers = {
    Authorization: userAJoin.token.access,
  };
  // 2. User A creates a new comment
  const commentCreatedRaw =
    await generate_random_community_platform_user_comments_create(
      userAConnection,
      { body: {} },
    );
  const commentCreated = typia.assert<any>(commentCreatedRaw);
  // 3. User A updates the comment content successfully
  const oldUpdatedAt = commentCreated.updated_at;
  const newContent = RandomGenerator.paragraph({ sentences: 3 });
  const commentUpdateBody: ICommunityPlatformComment.IUpdate = {
    content: newContent,
  };
  const updatedCommentRaw =
    await api.functional.communityPlatform.user.comments.update(
      userAConnection,
      {
        commentId: commentCreated.id,
        body: commentUpdateBody,
      },
    );
  const updatedComment = typia.assert<any>(updatedCommentRaw);
  // Validation
  TestValidator.equals(
    "comment id unchanged",
    updatedComment.id,
    commentCreated.id,
  );
  TestValidator.equals(
    "comment content updated",
    updatedComment.content,
    newContent,
  );
  TestValidator.predicate(
    "updated_at changed",
    new Date(updatedComment.updated_at).getTime() >
      new Date(oldUpdatedAt).getTime(),
  );
  TestValidator.equals(
    "owner user_id unchanged",
    updatedComment.user_id,
    commentCreated.user_id,
  );
  TestValidator.equals(
    "parent_id unchanged",
    updatedComment.parent_id,
    commentCreated.parent_id,
  );
  // 4. User B joins and authenticates
  const userBConnection: api.IConnection = { host: connection.host };
  const userBJoin = await authorize_user_join(userBConnection, { body: {} });
  typia.assert(userBJoin);
  userBConnection.headers = {
    Authorization: userBJoin.token.access,
  };
  // 5. User B tries to update User A's comment - expect authorization error
  await TestValidator.error("non-owner update blocked", async () => {
    await api.functional.communityPlatform.user.comments.update(
      userBConnection,
      {
        commentId: commentCreated.id,
        body: commentUpdateBody,
      },
    );
  });
  // 6. Moderator joins and authenticates
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoin = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  typia.assert(moderatorJoin);
  moderatorConnection.headers = {
    Authorization: moderatorJoin.token.access,
  };
  // 7. Moderator updates the same comment content
  const modNewContent = RandomGenerator.paragraph({ sentences: 4 });
  const modCommentUpdateBody: ICommunityPlatformComment.IUpdate = {
    content: modNewContent,
  };
  const modUpdatedCommentRaw =
    await api.functional.communityPlatform.user.comments.update(
      moderatorConnection,
      {
        commentId: commentCreated.id,
        body: modCommentUpdateBody,
      },
    );
  const modUpdatedComment = typia.assert<any>(modUpdatedCommentRaw);
  // Validate moderator update
  TestValidator.equals(
    "moderator comment id unchanged",
    modUpdatedComment.id,
    commentCreated.id,
  );
  TestValidator.equals(
    "moderator updated content",
    modUpdatedComment.content,
    modNewContent,
  );
  TestValidator.equals(
    "moderator owner user_id unchanged",
    modUpdatedComment.user_id,
    commentCreated.user_id,
  );
  TestValidator.equals(
    "moderator parent_id unchanged",
    modUpdatedComment.parent_id,
    commentCreated.parent_id,
  );
}
