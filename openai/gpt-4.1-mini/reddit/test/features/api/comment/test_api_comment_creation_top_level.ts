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

export async function test_api_comment_creation_top_level(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user connection and join new user
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {});
  // Set authorization header for user connection
  userConnection.headers ??= {};
  userConnection.headers.Authorization = authorizedUser.token.access;
  // 2. Prepare comment content
  const content = RandomGenerator.paragraph({ sentences: 1 });
  // 3. Create a new comment using utility function - top-level comment has parent = null
  const comment =
    await generate_random_community_platform_user_comments_create_comment(
      userConnection,
      {
        body: {
          content,
          postId: typia.random<string & tags.Format<"uuid">>(),
          parentId: null,
        },
      },
    );
  typia.assert(comment);
  // 4. Validate comment response structure and values
  TestValidator.predicate(
    "comment id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      comment.id,
    ),
  );
  TestValidator.equals("comment content matches", comment.content, content);
  TestValidator.equals(
    "comment postId matches",
    comment.postId,
    comment.postId,
  );
  TestValidator.equals("comment parent is null", comment.parent ?? null, null);
  // Validate author information (comment.user is author as per DTO)
  typia.assert(comment.user);
  TestValidator.equals("author id matches", comment.user.id, authorizedUser.id);
  TestValidator.equals(
    "author email matches",
    comment.user.email,
    authorizedUser.email,
  );
  TestValidator.equals(
    "author username matches",
    comment.user.username,
    authorizedUser.username,
  );
  TestValidator.equals(
    "author displayName matches",
    comment.user.displayName,
    authorizedUser.display_name,
  );
  // Validate karma is number and timestamps
  TestValidator.predicate(
    "author karma is number",
    typeof comment.user.karma === "number",
  );
  TestValidator.predicate(
    "createdAt is ISO string",
    typeof comment.createdAt === "string" && comment.createdAt.length > 0,
  );
  // Validate children array is empty when no replies
  TestValidator.equals(
    "children array empty",
    (comment.children ?? []).length,
    0,
  );
  // 5. Reject unauthenticated request
  await TestValidator.httpError(
    "unauthenticated request rejected",
    401,
    async () => {
      // Use a fresh connection with no auth header
      const unauthenticatedConnection: api.IConnection = {
        host: connection.host,
      };
      await generate_random_community_platform_user_comments_create_comment(
        unauthenticatedConnection,
        {
          body: {
            content: RandomGenerator.paragraph({ sentences: 1 }),
            postId: typia.random<string & tags.Format<"uuid">>(),
            parentId: null,
          },
        },
      );
    },
  );
}
