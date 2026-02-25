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

export async function test_api_comment_deletion_by_owner_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registers and authenticates
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, {});
  userConnection.headers = { Authorization: authorized.token.access };
  // 2. User creates a comment on a post
  //    For this test, we need a valid postId to create the comment. Since the scenario does not provide post creation, we simulate a postId.
  //    We generate random UUID string to simulate a postId.
  const postId = typia.random<string & tags.Format<"uuid">>();
  const comment =
    await generate_random_community_platform_user_comments_create_comment(
      userConnection,
      {
        body: {
          postId: postId,
          content: "Test comment to delete",
        },
      },
    );
  typia.assert(comment);
  // 3. User deletes their own comment by commentId
  await api.functional.communityPlatform.user.comments.erase(userConnection, {
    commentId: comment.id,
  });
  // 4. Validate deletion
  //    Since no direct API endpoint is provided for fetching one comment,
  //    we validate by ensuring that a subsequent delete attempt on the same comment ID fails with HTTP error,
  //    indicating that the comment no longer exists.
  await TestValidator.error(
    "deleting already deleted comment should fail",
    async () => {
      await api.functional.communityPlatform.user.comments.erase(
        userConnection,
        {
          commentId: comment.id,
        },
      );
    },
  );
}
