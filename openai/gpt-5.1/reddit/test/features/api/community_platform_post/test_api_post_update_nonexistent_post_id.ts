import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";

/**
 * Validate that updating a non-existent community platform post fails for an
 * authenticated member user.
 *
 * Business intent:
 *
 * - When a logged-in member user calls PUT
 *   /communityPlatform/memberUser/posts/{postId} with a postId that does not
 *   correspond to any existing community_platform_posts row, the API must fail
 *   the operation and must not create or upsert a new post.
 *
 * Test workflow:
 *
 * 1. Register a new member user via /auth/memberUser/join to obtain an
 *    authenticated memberUser context. The SDK automatically wires the access
 *    token into connection.headers.Authorization.
 * 2. Generate a random UUID to act as a non-existent postId.
 * 3. Construct a syntactically valid ICommunityPlatformPost.IUpdate payload with
 *    realistic random content.
 * 4. Invoke api.functional.communityPlatform.memberUser.posts.update with the
 *    non-existent postId and valid body, and assert that the call fails using
 *    TestValidator.error. We focus on the fact that an error is raised, without
 *    asserting a specific HTTP status code.
 *
 * Limitations:
 *
 * - We do not have a create-post or list-posts endpoint, so we cannot directly
 *   confirm absence of the post in storage or check for side effects. Instead,
 *   we rely on the invariant that a failing update on a non-existent ID implies
 *   no new row is created.
 */
export async function test_api_post_update_nonexistent_post_id(
  connection: api.IConnection,
) {
  // 1. Register a new member user so that subsequent calls run in memberUser context.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Generate a random UUID for a postId that is overwhelmingly likely to be non-existent.
  const nonExistentPostId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Build a syntactically valid update payload.
  const updateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    url: typia.random<string & tags.Format<"uri">>(),
    image_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPost.IUpdate;

  // 4. Attempt to update the non-existent post and assert that it fails.
  await TestValidator.error(
    "updating a non-existent postId must fail",
    async () => {
      await api.functional.communityPlatform.memberUser.posts.update(
        connection,
        {
          postId: nonExistentPostId,
          body: updateBody,
        },
      );
    },
  );
}
