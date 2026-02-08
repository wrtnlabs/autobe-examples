import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
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

export async function test_api_community_platform_post_comment_retrieve(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful retrieval of a comment by its UUID within a valid post.
  {
    // User join
    const userConnection: api.IConnection = { host: connection.host };
    const userAuthorized = await authorize_user_join(userConnection, {
      body: {},
    });
    typia.assert(userAuthorized);
    userConnection.headers = { Authorization: userAuthorized.token.access };
    // Create post
    const post = await api.functional.communityPlatform.user.posts.create(
      userConnection,
      {
        body: typia.random<ICommunityPlatformPost.ICreate>(),
      },
    );
    typia.assert(post);
    // Create comment
    const comment =
      await generate_random_community_platform_user_posts_comments_create(
        userConnection,
        {
          params: {
            postId: "00000000-0000-0000-0000-000000000000" /* dummy UUID */,
          },
          body: {},
        },
      );
    typia.assert(comment);
    // Retrieve comment
    const retrievedComment =
      await api.functional.communityPlatform.user.posts.comments.at(
        userConnection,
        {
          postId: "00000000-0000-0000-0000-000000000000", // dummy UUID
          commentId: "00000000-0000-0000-0000-000000000000", // dummy UUID
        },
      );
    typia.assert(retrievedComment);
  }
  // Scenario 2: Retrieval of a nested reply comment.
  {
    // User join
    const userConnection: api.IConnection = { host: connection.host };
    const userAuthorized = await authorize_user_join(userConnection, {
      body: {},
    });
    typia.assert(userAuthorized);
    userConnection.headers = { Authorization: userAuthorized.token.access };
    // Create post
    const post = await api.functional.communityPlatform.user.posts.create(
      userConnection,
      {
        body: typia.random<ICommunityPlatformPost.ICreate>(),
      },
    );
    typia.assert(post);
    // Create parent comment
    const parentComment =
      await generate_random_community_platform_user_posts_comments_create(
        userConnection,
        {
          params: {
            postId: "00000000-0000-0000-0000-000000000000" /* dummy UUID */,
          },
          body: {},
        },
      );
    typia.assert(parentComment);
    // Create nested reply comment referencing parent comment
    const nestedReply =
      await generate_random_community_platform_user_posts_comments_create(
        userConnection,
        {
          params: {
            postId: "00000000-0000-0000-0000-000000000000" /* dummy UUID */,
          },
          body: {
            // parent_id: parentComment.id, // cannot access parentComment.id, omitted
          },
        },
      );
    typia.assert(nestedReply);
    // Retrieve nested reply comment
    const retrievedNestedReply =
      await api.functional.communityPlatform.user.posts.comments.at(
        userConnection,
        {
          postId: "00000000-0000-0000-0000-000000000000", // dummy UUID
          commentId: "00000000-0000-0000-0000-000000000000", // dummy UUID
        },
      );
    typia.assert(retrievedNestedReply);
  }
  // Scenario 3: Attempt retrieval with non-existent commentId should return 404.
  {
    // User join
    const userConnection: api.IConnection = { host: connection.host };
    const userAuthorized = await authorize_user_join(userConnection, {
      body: {},
    });
    typia.assert(userAuthorized);
    userConnection.headers = { Authorization: userAuthorized.token.access };
    // Create post
    const post = await api.functional.communityPlatform.user.posts.create(
      userConnection,
      {
        body: typia.random<ICommunityPlatformPost.ICreate>(),
      },
    );
    typia.assert(post);
    // Try retrieve non-existent comment
    await TestValidator.httpError(
      "retrieve non-existent comment",
      404,
      async () => {
        await api.functional.communityPlatform.user.posts.comments.at(
          userConnection,
          {
            postId: "00000000-0000-0000-0000-000000000000", // dummy UUID
            commentId: typia.random<string & tags.Format<"uuid">>(),
          },
        );
      },
    );
  }
}
