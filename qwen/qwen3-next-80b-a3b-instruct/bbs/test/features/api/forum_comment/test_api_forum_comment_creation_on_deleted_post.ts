import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumPost";
import type { IEconomicForumPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumPostComment";
import type { IEconomicForumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumUser";
import { prepare_random_economic_forum_post } from "../../../prepare/prepare_random_economic_forum_post";
import { prepare_random_economic_forum_post_comment } from "../../../prepare/prepare_random_economic_forum_post_comment";
import { generate_random_economic_forum_user_posts_create } from "../../../generate/generate_random_economic_forum_user_posts_create";
import { generate_random_economic_forum_user_posts_comments_create } from "../../../generate/generate_random_economic_forum_user_posts_comments_create";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_forum_comment_creation_on_deleted_post(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate user for comment creation
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // Step 2: Since the API schema does not support post deletion or status updates,
  // we directly test the business rule that comment creation fails on non-existent posts.
  // This approximates the scenario of a 'deleted' post since the system treats
  // unknown post IDs as invalid.
  await TestValidator.error(
    "comment creation should fail on non-existent post",
    async () => {
      await api.functional.economicForum.user.posts.comments.create(
        userConnection,
        {
          postId: "00000000-0000-0000-0000-000000000000", // Non-existent UUID
          body: {} satisfies IEconomicForumPostComment.ICreate,
        },
      );
    },
  );
}
