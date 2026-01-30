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
export async function test_api_forum_comment_creation_by_user(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as user
  const userConnection: api.IConnection = { host: connection.host };
  const authResult: IEconomicForumUser.IAuthorized = await authorize_user_join(
    userConnection,
    {
      body: {},
    },
  );
  // Step 2: Create a forum post using the authenticated user connection
  const post: IEconomicForumPost =
    await generate_random_economic_forum_user_posts_create(userConnection, {
      body: {},
    });
  typia.assert(post);
  // Step 3: Create a comment on the post using the same authenticated user connection
  // Cast to any to make post.id accessible, then assert it's a string
  const postId = (post as any).id as string;
  const comment: IEconomicForumPostComment =
    await generate_random_economic_forum_user_posts_comments_create(
      userConnection,
      {
        body: {},
        params: {
          postId,
        },
      },
    );
  typia.assert(comment);
  // Step 4: Validate comment response contains all expected fields according to schema
  // Use typia.assert() for complete type and format validation
  // No manual format validation needed - typia.assert() handles all validation
  TestValidator.equals(
    "comment status should be active",
    comment.status,
    "active",
  );
}
