import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
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
import { generate_random_community_platform_user_comments_create_comment } from "../../../generate/generate_random_community_platform_user_comments_create_comment";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";

export async function test_api_comment_creation_reply(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, { body: {} });
  userConnection.headers = { Authorization: user.token.access };
  // For testing comments, we need a postId. Since no utility exists for post creation,
  // we generate a random UUID for postId to simulate an existing post.
  const postId = typia.random<string & tags.Format<"uuid">>();
  // 2. Create a top-level comment
  const parentComment =
    await generate_random_community_platform_user_comments_create_comment(
      userConnection,
      {
        body: {
          postId,
          parentId: null,
        },
      },
    );
  typia.assert(parentComment);
  // 3. Create a reply comment with same postId and parentId as above
  const replyContent = RandomGenerator.paragraph({ sentences: 3 });
  const replyComment =
    await generate_random_community_platform_user_comments_create_comment(
      userConnection,
      {
        body: {
          content: replyContent,
          postId,
          parentId: parentComment.id,
        },
      },
    );
  typia.assert(replyComment);
  // 4. Verify response correctness
  TestValidator.equals(
    "reply comment parentId matches",
    replyComment.parent?.id,
    parentComment.id,
  );
  TestValidator.equals(
    "reply comment postId matches",
    replyComment.postId,
    postId,
  );
  TestValidator.predicate(
    "reply comment has correct author id",
    replyComment.user.id === user.id,
  );
  TestValidator.predicate(
    "reply comment content matches",
    replyComment.content === replyContent,
  );
  TestValidator.predicate(
    "reply comment is not deleted",
    replyComment.isDeleted === false,
  );
  TestValidator.predicate(
    "reply comment has createdAt",
    typeof replyComment.createdAt === "string" &&
      replyComment.createdAt.length > 0,
  );
  TestValidator.predicate(
    "reply comment has updatedAt",
    typeof replyComment.updatedAt === "string" &&
      replyComment.updatedAt.length > 0,
  );
  TestValidator.equals(
    "reply comment deletedAt is null",
    replyComment.deletedAt,
    null,
  );
  TestValidator.equals(
    "reply comment children is empty array",
    replyComment.children,
    [],
  );
  // 5. Verify authorization enforcement for comment creation
  // Create an unauthorized client without auth header
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized comment creation",
    401,
    async () => {
      await api.functional.communityPlatform.user.comments.createComment(
        unauthorizedConnection,
        {
          body: {
            content: replyContent,
            postId,
            parentId: parentComment.id,
          },
        },
      );
    },
  );
}
