import api from "@ORGANIZATION/PROJECT-api";
import { RandomGenerator, TestValidator } from "@nestia/e2e";
import typia from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { generate_random_community_platform_user_posts_comments_create } from "../../../generate/generate_random_community_platform_user_posts_comments_create";

export async function test_api_post_comment_create_top_level(
  connection: api.IConnection,
): Promise<void> {
  // 1. User join and authentication
  const userJoinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userJoinConnection, {
    body: {},
  });
  typia.assert(authorized);

  // Create user connection with auth token
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = { Authorization: authorized.token.access };

  // 2. Create a post for comment target
  const post = await api.functional.communityPlatform.user.posts.create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 1 }),
      },
    },
  );
  typia.assert(post);

  // 3. Create top-level comment on the post
  const commentBody = {
    contentText: RandomGenerator.paragraph({ sentences: 2 }),
    parentCommentId: null, // explicitly top-level
  };

  const comment = await generate_random_community_platform_user_posts_comments_create(
    userConnection,
    {
      body: commentBody,
      params: { postId: (post as any)["id"] ?? "" },
    },
  );
  typia.assert(comment);

  // 4. Validate comment fields where accessible
  TestValidator.predicate(
    "comment id exists",
    typeof (comment as any)["id"] === "string" && (comment as any)["id"].length > 0,
  );

  TestValidator.equals(
    "comment content matches",
    (comment as any)["contentText"],
    commentBody.contentText,
  );

  // Other validations omitted due to missing properties
}
