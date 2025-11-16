import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";

/**
 * Ensures permission enforcement for creating post attachments.
 *
 * This test verifies that only the owner of a post (or a privileged editor) can
 * attach files to that post. Specifically, it creates a post as User A, then
 * attempts to use User B (who is not the post owner) to attach a file to User
 * A's post. The test checks that this operation fails and the error is
 * correctly thrown.
 *
 * Step-by-step process:
 *
 * 1. Register User A (post owner) via /auth/user/join and authenticate session.
 * 2. Register a community for associating with the post (using the post DTO, as
 *    directly creating community is not part of this test; the community in the
 *    post create input should be a valid UUID, so typia.random can be used for
 *    it).
 * 3. User A creates a post in the community using /communityPlatform/user/posts.
 * 4. Register User B (attacker) via /auth/user/join and authenticate as User B.
 * 5. Attempt to attach a new file via
 *    /communityPlatform/user/posts/{postId}/attachments to the post owned by
 *    User A, using User B's session. This should fail.
 * 6. Confirm that attaching as a non-owner is properly denied by checking for
 *    error response.
 */
export async function test_api_post_attachment_create_wrong_user_permission(
  connection: api.IConnection,
) {
  // 1. Register User A
  const ownerJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(ownerJoin);

  // 2. Create a post as User A
  // The community_id must be set; since the test's scope doesn't require actual community creation,
  // it's sufficient to use typia.random for a valid UUID.
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const postCreateBody = {
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    status: "published",
    community_id: communityId,
  } satisfies ICommunityPlatformPost.ICreate;
  const post = await api.functional.communityPlatform.user.posts.create(
    connection,
    { body: postCreateBody },
  );
  typia.assert(post);

  // 3. Register User B
  const attackerJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(attackerJoin);

  // 4. Attempt to create an attachment with User B's credentials on User A's post
  const attachmentBody = {
    uri: typia.random<string & tags.Format<"uri">>(),
    mimetype: RandomGenerator.pick([
      "image/png",
      "image/jpeg",
      "image/gif",
      "application/pdf",
      "text/plain",
    ] as const),
  } satisfies ICommunityPlatformPostAttachment.ICreate;
  await TestValidator.error(
    "Non-owner should not be able to attach file to another user's post",
    async () => {
      await api.functional.communityPlatform.user.posts.attachments.create(
        connection,
        {
          postId: post.id,
          body: attachmentBody,
        },
      );
    },
  );
}
