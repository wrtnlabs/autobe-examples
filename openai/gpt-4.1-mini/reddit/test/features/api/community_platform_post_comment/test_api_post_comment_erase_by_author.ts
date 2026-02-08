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

export async function test_api_post_comment_erase_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. User joins the community platform
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, { body: {} });
  userConnection.headers = { Authorization: authorized.token.access };
  // 2. User creates a post
  const post = await api.functional.communityPlatform.user.posts.create(
    userConnection,
    {
      body: {
        community_id: typia.random<string & tags.Format<"uuid">>(),
        title: RandomGenerator.name(),
        post_type: "text",
        contentText: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  // Assert post has 'id' property
  const post_with_id = typia.assert(post) as ICommunityPlatformPost & { id: string };

  // 3. User creates a comment on the post
  const comment =
    await generate_random_community_platform_user_posts_comments_create(
      userConnection,
      {
        params: { postId: post_with_id.id },
      },
    );
  const comment_with_id = typia.assert(comment) as ICommunityPlatformPostComment & { id: string };

  // 4. User deletes their own comment
  await api.functional.communityPlatform.user.posts.comments.erase(
    userConnection,
    {
      postId: post_with_id.id,
      commentId: comment_with_id.id,
    },
  );

  // 5. Check comment deletion by trying to delete again (should throw 404)
  await TestValidator.httpError(
    "delete already deleted comment returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.user.posts.comments.erase(
        userConnection,
        {
          postId: post_with_id.id,
          commentId: comment_with_id.id,
        },
      );
    },
  );

  // 6. Setup a second user to try unauthorized delete
  const otherUserConnection: api.IConnection = { host: connection.host };
  const otherAuthorized = await authorize_user_join(otherUserConnection, {
    body: {},
  });
  otherUserConnection.headers = { Authorization: otherAuthorized.token.access };

  // 7. Second user creates a comment
  const comment2 =
    await generate_random_community_platform_user_posts_comments_create(
      otherUserConnection,
      {
        params: { postId: post_with_id.id },
      },
    );
  const comment2_with_id = typia.assert(comment2) as ICommunityPlatformPostComment & { id: string };

  // 8. First user tries to delete second user's comment (should throw 403)
  await TestValidator.httpError(
    "unauthorized user cannot delete other's comment",
    403,
    async () => {
      await api.functional.communityPlatform.user.posts.comments.erase(
        userConnection,
        {
          postId: post_with_id.id,
          commentId: comment2_with_id.id,
        },
      );
    },
  );

  // 9. Second user deletes their own comment (should succeed)
  await api.functional.communityPlatform.user.posts.comments.erase(
    otherUserConnection,
    {
      postId: post_with_id.id,
      commentId: comment2_with_id.id,
    },
  );
}
