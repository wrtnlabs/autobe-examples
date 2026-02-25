import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
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
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_post_at_success_and_failure_cases(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Scenario 1: Retrieve existing post details by valid postId
   * - Create a user and authenticate
   * - Create a new community
   * - Create a new post of type text in the community by the user
   * - Retrieve the post by postId
   * - Verify HTTP 200 response with correct post id, communityId, authorUserId matching the creator
   * - Verify post content based on type (text content present, link and images absent)
   * - Verify nested authorUser and community details are correctly returned
   * - Verify voteCount and commentCount are integers
   */
  // Create user and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {});
  userConnection.headers = { Authorization: authorizedUser.token.access };
  // Create new community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {},
    );
  typia.assert(community);
  // Create new text post in community
  const postCreateBody = {
    title: "Test Post Title",
    postType: "text",
    content: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformPost.ICreate;
  const post =
    await api.functional.communityPlatform.user.communities.posts.create(
      userConnection,
      {
        communityId: community.id,
        body: postCreateBody,
      },
    );
  typia.assert(post);
  // Retrieve the post by postId
  const retrievedPost = await api.functional.communityPlatform.user.posts.at(
    userConnection,
    {
      postId: post.id,
    },
  );
  typia.assert(retrievedPost);
  TestValidator.equals("post id matches", retrievedPost.id, post.id);
  TestValidator.equals(
    "community id matches",
    retrievedPost.communityId,
    community.id,
  );
  TestValidator.equals(
    "author user id matches",
    retrievedPost.authorUserId,
    authorizedUser.id,
  );
  TestValidator.predicate(
    "post type is text",
    retrievedPost.postType === "text",
  );
  TestValidator.predicate(
    "post content present for text post",
    (retrievedPost as any).content !== undefined &&
      (retrievedPost as any).content !== null &&
      typeof (retrievedPost as any).content === "string" &&
      (retrievedPost as any).content.length > 0,
  );
  TestValidator.predicate(
    "post link field absent for text post",
    !("url" in (retrievedPost as any)),
  );
  TestValidator.predicate(
    "post images field absent for text post",
    !("images" in (retrievedPost as any)),
  );
  TestValidator.predicate(
    "authorUser is non-null",
    retrievedPost.authorUser !== null,
  );
  typia.assert(retrievedPost.authorUser);
  TestValidator.predicate(
    "community is non-null",
    retrievedPost.community !== null,
  );
  typia.assert(retrievedPost.community);
  TestValidator.predicate(
    "voteCount is a number",
    Number.isInteger(retrievedPost.voteCount),
  );
  TestValidator.predicate(
    "commentCount is a number",
    Number.isInteger(retrievedPost.commentCount),
  );
  /**
   * Scenario 2: Retrieve non-existent post
   * - Call GET with a random non-existing postId UUID
   * - Verify HTTP 404 response indicating post not found
   */
  const randomNonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent post returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.user.posts.at(userConnection, {
        postId: randomNonExistentId,
      });
    },
  );
  /**
   * Scenario 3: Retrieve post with public access (no auth required)
   * - Create a user and authenticate
   * - Create community and post
   * - Retrieve post without authentication
   * - Verify HTTP 200 and correct post details as in Scenario 1
   */
  const publicConnection: api.IConnection = { host: connection.host };
  // Create user and authenticate (again)
  const publicUser = await authorize_user_join(publicConnection, {});
  const publicUserConnection: api.IConnection = { host: connection.host };
  publicUserConnection.headers = { Authorization: publicUser.token.access };
  // Create community
  const publicCommunity =
    await generate_random_community_platform_user_communities_create(
      publicUserConnection,
      {},
    );
  typia.assert(publicCommunity);
  // Create post
  const publicPostCreateBody = {
    title: "Public Test Post",
    postType: "text",
    content: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformPost.ICreate;
  const publicPost =
    await api.functional.communityPlatform.user.communities.posts.create(
      publicUserConnection,
      {
        communityId: publicCommunity.id,
        body: publicPostCreateBody,
      },
    );
  typia.assert(publicPost);
  // Retrieve post without authentication
  const fetchedPublicPost =
    await api.functional.communityPlatform.user.posts.at(publicConnection, {
      postId: publicPost.id,
    });
  typia.assert(fetchedPublicPost);
  TestValidator.equals(
    "public post id matches",
    fetchedPublicPost.id,
    publicPost.id,
  );
  TestValidator.equals(
    "public community id matches",
    fetchedPublicPost.communityId,
    publicCommunity.id,
  );
  TestValidator.equals(
    "public author user id matches",
    fetchedPublicPost.authorUserId,
    publicUser.id,
  );
  TestValidator.predicate(
    "public post type is text",
    fetchedPublicPost.postType === "text",
  );
  TestValidator.predicate(
    "public post content present for text post",
    (fetchedPublicPost as any).content !== undefined &&
      (fetchedPublicPost as any).content !== null &&
      typeof (fetchedPublicPost as any).content === "string" &&
      (fetchedPublicPost as any).content.length > 0,
  );
  TestValidator.predicate(
    "public post link field absent for text post",
    !("url" in (fetchedPublicPost as any)),
  );
  TestValidator.predicate(
    "public post images field absent for text post",
    !("images" in (fetchedPublicPost as any)),
  );
  TestValidator.predicate(
    "public authorUser is non-null",
    fetchedPublicPost.authorUser !== null,
  );
  typia.assert(fetchedPublicPost.authorUser);
  TestValidator.predicate(
    "public community is non-null",
    fetchedPublicPost.community !== null,
  );
  typia.assert(fetchedPublicPost.community);
  TestValidator.predicate(
    "public voteCount is a number",
    Number.isInteger(fetchedPublicPost.voteCount),
  );
  TestValidator.predicate(
    "public commentCount is a number",
    Number.isInteger(fetchedPublicPost.commentCount),
  );
}
