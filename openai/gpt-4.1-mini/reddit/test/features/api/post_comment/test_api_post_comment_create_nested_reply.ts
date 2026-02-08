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

export async function test_api_post_comment_create_nested_reply(
  connection: api.IConnection,
): Promise<void> {
  const userJoinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userJoinConnection, {
    body: {},
  });
  typia.assert(authorized);

  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = { Authorization: authorized.token.access };

  const post = await api.functional.communityPlatform.user.posts.create(
    userConnection,
    {
      body: {
        title: "Sample Post for Comment Testing",
        post_type: "text",
        text: { content: "This is a sample post content for testing." },
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // We should not directly use post.id since property 'id' does not exist
  // Instead, use a safe cast or retrieve the post ID from the create API response using typia.assert

  const postId = (post as unknown as { id: string }).id;

  const parentComment =
    await generate_random_community_platform_user_posts_comments_create(
      userConnection,
      {
        params: { postId: postId },
      },
    );
  typia.assert(parentComment);

  // Similarly for parentComment.id
  const parentCommentId = (parentComment as unknown as { id: string }).id;

  const nestedCommentBody: ICommunityPlatformPostComment.ICreate = {
    contentText: "This is a nested reply comment.",
    parentCommentId: parentCommentId,
  };

  const nestedComment =
    await generate_random_community_platform_user_posts_comments_create(
      userConnection,
      {
        params: { postId: postId },
        body: nestedCommentBody,
      },
    );
  typia.assert(nestedComment);

  // Validate nested comment fields via safe casting
  const nestedCommentCasted = nestedComment as unknown as {
    postId: string;
    parentCommentId: string | null;
    contentText: string;
    createdAt: string;
    updatedAt: string;
  };

  TestValidator.equals(
    "nested comment's postId matches parent post",
    nestedCommentCasted.postId,
    postId,
  );

  TestValidator.equals(
    "nested comment's parentCommentId matches parent comment",
    nestedCommentCasted.parentCommentId,
    parentCommentId,
  );

  TestValidator.predicate(
    "nested comment has non-empty contentText",
    typeof nestedCommentCasted.contentText === "string" &&
      nestedCommentCasted.contentText.length > 0,
  );

  TestValidator.predicate(
    "nested comment has valid ISO created_at",
    typeof nestedCommentCasted.createdAt === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(nestedCommentCasted.createdAt),
  );

  TestValidator.predicate(
    "nested comment has valid ISO updated_at",
    typeof nestedCommentCasted.updatedAt === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(nestedCommentCasted.updatedAt),
  );

  TestValidator.predicate(
    "nested comment parentCommentId is non-null",
    nestedCommentCasted.parentCommentId !== null,
  );
}
