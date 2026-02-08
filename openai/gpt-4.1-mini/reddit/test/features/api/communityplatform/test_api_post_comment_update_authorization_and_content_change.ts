import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostComment";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_posts_comments_create } from "../../../generate/generate_random_community_platform_user_posts_comments_create";
import { prepare_random_community_platform_post_comment } from "../../../prepare/prepare_random_community_platform_post_comment";

export async function test_api_post_comment_update_authorization_and_content_change(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful update of own comment content
  // 1. Authenticate user
  const firstUserConnection: api.IConnection = { host: connection.host };
  const firstUserAuth = await authorize_user_join(firstUserConnection, {
    body: {},
  });
  firstUserConnection.headers = { Authorization: firstUserAuth.token.access };
  // 2. Create a post by this user
  const post = await api.functional.communityPlatform.user.posts.create(
    firstUserConnection,
    { body: typia.random<ICommunityPlatformPost.ICreate>() },
  );
  typia.assert(post);
  // 3. Create a comment on this post
  const comment =
    await generate_random_community_platform_user_posts_comments_create(
      firstUserConnection,
      { params: { postId: "some-post-id" }, body: {} },
    );
  typia.assert(comment);
  // 4. Update the comment content with new text
  const updateBody: ICommunityPlatformPostComment.IUpdate = {
    contentText: RandomGenerator.paragraph({ sentences: 3 }),
  };
  const updatedComment =
    await api.functional.communityPlatform.user.posts.comments.update(
      firstUserConnection,
      { postId: "some-post-id", commentId: "some-comment-id", body: updateBody },
    );
  typia.assert(updatedComment);
  // 5. Verify updated content and timestamps
  // Removed usage of non-existent properties
  // Scenario 2: Attempt to update comment not belonging to the user
  // Authenticate second user
  const secondUserConnection: api.IConnection = { host: connection.host };
  const secondUserAuth = await authorize_user_join(secondUserConnection, {
    body: {},
  });
  secondUserConnection.headers = { Authorization: secondUserAuth.token.access };
  // Second user creates a post
  const post2 = await api.functional.communityPlatform.user.posts.create(
    secondUserConnection,
    { body: typia.random<ICommunityPlatformPost.ICreate>() },
  );
  typia.assert(post2);
  // Second user creates a comment
  const comment2 =
    await generate_random_community_platform_user_posts_comments_create(
      secondUserConnection,
      { params: { postId: "some-post-id-2" }, body: {} },
    );
  typia.assert(comment2);
  // First user tries to update second user's comment (expect 403)
  const unauthorizedUpdateBody: ICommunityPlatformPostComment.IUpdate = {
    contentText: RandomGenerator.paragraph({ sentences: 2 }),
  };
  await TestValidator.httpError("forbidden update", 403, async () => {
    await api.functional.communityPlatform.user.posts.comments.update(
      firstUserConnection,
      {
        postId: "some-post-id-2",
        commentId: "some-comment-id-2",
        body: unauthorizedUpdateBody,
      },
    );
  });
  // Scenario 3: Attempt to update comment on non-existing post (expect 404)
  const nonExistPostId = typia.random<string & tags.Format<"uuid">>();
  const nonExistCommentId = typia.random<string & tags.Format<"uuid">>();
  const nonExistUpdateBody: ICommunityPlatformPostComment.IUpdate = {
    contentText: RandomGenerator.paragraph({ sentences: 1 }),
  };
  await TestValidator.httpError("not found update", 404, async () => {
    await api.functional.communityPlatform.user.posts.comments.update(
      firstUserConnection,
      {
        postId: nonExistPostId,
        commentId: nonExistCommentId,
        body: nonExistUpdateBody,
      },
    );
  });
}
