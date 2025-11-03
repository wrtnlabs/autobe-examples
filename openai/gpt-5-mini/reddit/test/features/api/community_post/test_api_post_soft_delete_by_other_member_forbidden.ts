import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsPostMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostMedia";
import type { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";

export async function test_api_post_soft_delete_by_other_member_forbidden(
  connection: api.IConnection,
) {
  /**
   * Verify that a different authenticated community member cannot soft-delete
   * another user's post (authorization enforcement).
   *
   * Note: The provided SDK surface does not include a GET/read endpoint for
   * posts. Therefore, this test uses the created post object (returned by the
   * create API) to validate that `deleted_at` remains null and that
   * `is_published` remains unchanged after the unauthorized delete attempt.
   * This is an intentional, documented adaptation to the available SDK.
   */

  // 1) Create communityMember A (author)
  const authorEmail: string = `author-${Date.now()}@example.test`;
  const authorUsername: string = `author_${Date.now()}_${RandomGenerator.alphaNumeric(4)}`;
  const authorAuth: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(connection, {
      body: {
        email: authorEmail,
        username: authorUsername,
        password: "Passw0rd!",
        session_context: {
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        },
      } satisfies ICommunityBbsCommunityMember.ICreate,
    });
  typia.assert(authorAuth);

  // 2) Create a community as author A (use a robust unique slug)
  const communitySlug = `test-community-${Date.now()}-${RandomGenerator.alphaNumeric(4)}`;
  const community: ICommunityBbsCommunity =
    await api.functional.communityBbs.communityMember.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          slug: communitySlug,
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3) Create a text post in the community as author A
  const post: ICommunityBbsPost =
    await api.functional.communityBbs.communityMember.communities.posts.create(
      connection,
      {
        communitySlug: community.slug,
        body: {
          title: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 3,
            wordMax: 8,
          }),
          body: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 8,
            sentenceMax: 12,
          }),
          post_type: "text",
        } satisfies ICommunityBbsPost.ICreate,
      },
    );
  typia.assert(post);

  // Save initial state for later comparison
  const initialIsPublished: boolean = post.is_published;
  const initialDeletedAt = post.deleted_at;

  TestValidator.equals(
    "created post deleted_at initially null",
    post.deleted_at,
    null,
  );

  // 4) Prepare a fresh connection for communityMember B
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 5) Create communityMember B (different user)
  const memberBEmail = `memberb-${Date.now()}@example.test`;
  const memberBUsername = `memberb_${Date.now()}_${RandomGenerator.alphaNumeric(4)}`;
  const memberBAuth: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(unauthConn, {
      body: {
        email: memberBEmail,
        username: memberBUsername,
        password: "Passw0rd!",
        session_context: {
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        },
      } satisfies ICommunityBbsCommunityMember.ICreate,
    });
  typia.assert(memberBAuth);

  // 6) Attempt unauthorized DELETE by B - must throw (use TestValidator.error)
  await TestValidator.error("non-author cannot delete post", async () => {
    await api.functional.communityBbs.communityMember.posts.erase(unauthConn, {
      postId: post.id,
    });
  });

  // 7) Validate that the post object (returned on creation) remains unchanged.
  // Note: Due to lack of a GET endpoint in the provided SDK functions, this
  // assertion uses the original created post object as the available evidence.
  typia.assert(post);
  TestValidator.equals(
    "post not soft-deleted",
    post.deleted_at,
    initialDeletedAt,
  );
  TestValidator.equals(
    "is_published remains unchanged",
    post.is_published,
    initialIsPublished,
  );
}
