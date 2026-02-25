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

export async function test_api_comment_update_by_author_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. User joins and authenticates
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser: ICommunityPlatformUser.IAuthorized =
    await authorize_user_join(userConnection, {});
  userConnection.headers = {
    Authorization: authorizedUser.token.access,
  };
  // 2. Create a new comment
  const createdComment: ICommunityPlatformComment =
    await generate_random_community_platform_user_comments_create_comment(
      userConnection,
      {},
    );
  typia.assert(createdComment);
  // 3. Prepare updated content
  const updatedContent = `${createdComment.content} ${RandomGenerator.paragraph({ sentences: 2 })}`;
  // 4. Update the comment
  const updatedComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.user.comments.update(
      userConnection,
      {
        commentId: createdComment.id,
        body: {
          content: updatedContent,
        } satisfies ICommunityPlatformComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  // 5. Assertions
  TestValidator.equals(
    "comment id remains unchanged",
    updatedComment.id,
    createdComment.id,
  );
  TestValidator.equals(
    "comment content updated",
    updatedComment.content,
    updatedContent,
  );
  TestValidator.equals(
    "comment post id remains unchanged",
    updatedComment.postId,
    createdComment.postId,
  );
  TestValidator.equals(
    "comment author id remains unchanged",
    updatedComment.user.id,
    createdComment.user.id,
  );
  TestValidator.predicate(
    "comment updatedAt is newer or equal",
    new Date(updatedComment.updatedAt) >= new Date(createdComment.updatedAt),
  );
  TestValidator.predicate(
    "comment is not deleted",
    updatedComment.isDeleted === false,
  );
}
