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

export async function test_api_post_comment_erase_authorization_and_existence(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful deletion of a post comment by its author
  // Scenario 2: Authorization failure when deleting others' comment without moderator privileges
  // Scenario 3: Deleting a non-existent post comment
  // 1. Author User joins the platform
  const authorJoinConnection: api.IConnection = { host: connection.host };
  const authorAuthorized = await authorize_user_join(authorJoinConnection, {});
  typia.assert(authorAuthorized);
  authorJoinConnection.headers = {
    Authorization: authorAuthorized.token.access,
  };
  // 2. Author creates a community
  const community =
    await generate_random_community_platform_user_communities_create(
      authorJoinConnection,
      {},
    );
  typia.assert(community);
  // 3. Author creates a post in the community
  const postBody: ICommunityPlatformPost.ICreate = {
    title: "Test Post Title",
    postType: "text",
    content_text: "Test post content",
  } as ICommunityPlatformPost.ICreate; // using type assertion because IPost.ICreate unions are not fully exposed
  const post =
    await api.functional.communityPlatform.user.communities.posts.create(
      authorJoinConnection,
      {
        communityId: community.id,
        body: postBody,
      },
    );
  typia.assert(post);
  // 4. Author adds a comment on the post
  const comment =
    await generate_random_community_platform_user_post_comments_create(
      authorJoinConnection,
      {
        body: {
          post_id: post.id,
          content_text: "Author comment",
        },
      },
    );
  typia.assert(comment);
  // 5. Scenario 1: Author deletes own comment successfully
  await api.functional.communityPlatform.user.postComments.erase(
    authorJoinConnection,
    {
      postCommentId: comment.id,
    },
  );
  // 6. Second User joins the platform
  const secondJoinConnection: api.IConnection = { host: connection.host };
  const secondAuthorized = await authorize_user_join(secondJoinConnection, {});
  typia.assert(secondAuthorized);
  secondJoinConnection.headers = {
    Authorization: secondAuthorized.token.access,
  };
  // 7. Scenario 2: Second user attempts to delete author's comment (which should no longer exist, so recreate comment for this test)
  // Create the comment again
  const commentForSecondUserTest =
    await generate_random_community_platform_user_post_comments_create(
      authorJoinConnection,
      {
        body: {
          post_id: post.id,
          content_text: "Author comment for second user test",
        },
      },
    );
  typia.assert(commentForSecondUserTest);
  await TestValidator.httpError(
    "delete comment by unauthorized user",
    403,
    async () => {
      await api.functional.communityPlatform.user.postComments.erase(
        secondJoinConnection,
        {
          postCommentId: commentForSecondUserTest.id,
        },
      );
    },
  );
  // 8. Scenario 3: Deleting a non-existent post comment (random UUID)
  const randomNonExistentUUID = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "delete non-existent comment throws 404",
    404,
    async () => {
      await api.functional.communityPlatform.user.postComments.erase(
        authorJoinConnection,
        {
          postCommentId: randomNonExistentUUID,
        },
      );
    },
  );
}
