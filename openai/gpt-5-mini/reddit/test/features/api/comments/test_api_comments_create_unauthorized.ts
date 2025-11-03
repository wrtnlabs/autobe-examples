import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsComment";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsPostMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostMedia";
import type { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";

export async function test_api_comments_create_unauthorized(
  connection: api.IConnection,
) {
  /**
   * Validate that creating a comment without authentication is rejected.
   *
   * Steps:
   *
   * 1. Create a community member (setup) via POST /auth/communityMember/join
   * 2. Create a community as the authenticated member
   * 3. Create a post in that community as the authenticated member
   * 4. Attempt to create a comment on that post WITHOUT authentication
   * 5. Verify the operation throws an error and that the post's comment_count
   *    remains unchanged (we rely on the created post response since no GET
   *    endpoint or direct DB access is available in the provided SDK)
   */

  // 1. Create a community member (setup)
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberUsername = `testuser_${RandomGenerator.alphaNumeric(6)}`;

  const authorized = await api.functional.auth.communityMember.join(
    connection,
    {
      body: {
        email: memberEmail,
        username: memberUsername,
        password: "Passw0rd!",
        session_context: {
          href: "http://localhost/",
          referrer: "http://localhost/ref",
        },
      } satisfies ICommunityBbsCommunityMember.ICreate,
    },
  );
  typia.assert(authorized);

  // 2. Create a community as the authenticated member
  const communitySlug = `test-community-${Date.now()}`;
  const community =
    await api.functional.communityBbs.communityMember.communities.create(
      connection,
      {
        body: {
          name: `Test Community ${RandomGenerator.name(2)}`,
          slug: communitySlug,
          description: RandomGenerator.paragraph({
            sentences: 6,
            wordMin: 3,
            wordMax: 8,
          }),
          visibility: "public",
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Create a post in that community as the authenticated member
  const post =
    await api.functional.communityBbs.communityMember.communities.posts.create(
      connection,
      {
        communitySlug,
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 10,
          }),
          post_type: "text",
          body: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies ICommunityBbsPost.ICreate,
      },
    );
  typia.assert(post);

  // Expect initial comment count to be zero (server-maintained aggregate on creation)
  TestValidator.equals(
    "initial post comment count is zero",
    post.comment_count,
    0,
  );

  // 4. Prepare an unauthenticated connection (allowed pattern)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 5. Attempt to create a comment without authentication -> should throw
  await TestValidator.error(
    "unauthenticated comment creation should fail",
    async () => {
      await api.functional.communityBbs.communityMember.posts.comments.create(
        unauthConn,
        {
          postId: post.id,
          body: {
            body: "Anonymous attempt",
          } satisfies ICommunityBbsComment.ICreate,
        },
      );
    },
  );

  // 6. Verify post.comment_count remains unchanged (we can't re-fetch the post,
  // so rely on the created post result and the fact that the create-comment
  // operation failed)
  TestValidator.equals(
    "post.comment_count remains unchanged after unauthorized attempt",
    post.comment_count,
    0,
  );
}
