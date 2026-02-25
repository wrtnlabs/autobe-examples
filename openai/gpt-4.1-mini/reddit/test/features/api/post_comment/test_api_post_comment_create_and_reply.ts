import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
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
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_post_comments_create } from "../../../generate/generate_random_community_platform_user_post_comments_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post_comment } from "../../../prepare/prepare_random_community_platform_post_comment";

export async function test_api_post_comment_create_and_reply(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new user
  const userJoinConnection: api.IConnection = { host: connection.host };
  const authorization: ICommunityPlatformUser.IAuthorized =
    await authorize_user_join(userJoinConnection, {});
  userJoinConnection.headers = {
    Authorization: authorization.token.access,
  };
  // 2. Create a new community
  const community =
    await generate_random_community_platform_user_communities_create(
      userJoinConnection,
      {},
    );
  typia.assert(community);
  // 3. Create a post within the community
  const postBody: ICommunityPlatformPost.ICreate = {
    title: RandomGenerator.name(),
    postType: "text",
    content: RandomGenerator.paragraph({ sentences: 3 }),
  };
  const post =
    await api.functional.communityPlatform.user.communities.posts.create(
      userJoinConnection,
      {
        communityId: community.id,
        body: postBody,
      },
    );
  typia.assert(post);
  // 4. Scenario 1: Create top-level comment
  const commentContent1 = RandomGenerator.paragraph({ sentences: 2 });
  const comment1 =
    await generate_random_community_platform_user_post_comments_create(
      userJoinConnection,
      {
        body: {
          post_id: post.id,
          content_text: commentContent1,
          parent_comment_id: null,
        },
      },
    );
  typia.assert(comment1);
  // Validate comment1 properties
  TestValidator.equals("comment content", comment1.content, commentContent1);
  TestValidator.equals("comment postId", comment1.postId, post.id);
  TestValidator.equals(
    "comment author id",
    comment1.author.id,
    authorization.id,
  );
  TestValidator.predicate(
    "comment createdAt not empty",
    comment1.createdAt.length > 0,
  );
  TestValidator.predicate(
    "comment updatedAt not empty",
    comment1.updatedAt.length > 0,
  );
  TestValidator.equals("comment parentComment", comment1.parentComment, null);
  // 5. Scenario 2: Create reply comment to comment1
  const commentContent2 = RandomGenerator.paragraph({ sentences: 1 });
  const comment2 =
    await generate_random_community_platform_user_post_comments_create(
      userJoinConnection,
      {
        body: {
          post_id: post.id,
          content_text: commentContent2,
          parent_comment_id: comment1.id,
        },
      },
    );
  typia.assert(comment2);
  // Validate comment2 properties
  TestValidator.equals("reply content", comment2.content, commentContent2);
  TestValidator.equals("reply postId", comment2.postId, post.id);
  TestValidator.equals("reply author id", comment2.author.id, authorization.id);
  TestValidator.predicate(
    "reply createdAt not empty",
    comment2.createdAt.length > 0,
  );
  TestValidator.predicate(
    "reply updatedAt not empty",
    comment2.updatedAt.length > 0,
  );
  if (comment2.parentComment === null || comment2.parentComment === undefined) {
    throw new Error("comment2.parentComment must not be null or undefined");
  }
  TestValidator.equals(
    "reply parentComment id",
    comment2.parentComment.id,
    comment1.id,
  );
}
