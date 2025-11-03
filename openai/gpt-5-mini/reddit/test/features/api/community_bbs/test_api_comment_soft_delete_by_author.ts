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

/**
 * Validate that a community member (author) can soft-delete their own comment.
 *
 * Business context:
 *
 * - A community member creates a community and a post, then posts a comment.
 * - The comment author may soft-delete their own comment; moderators have
 *   separate flows (not exercised here). The system records deletion as a
 *   soft-delete (deleted_at) and emits audit logs; because this test runs
 *   without direct DB access it verifies the observable API effects and
 *   permission boundaries instead of raw DB rows.
 *
 * Test steps:
 *
 * 1. Author joins (POST /auth/communityMember/join) and receives tokens.
 * 2. Author creates a community (POST /communityBbs/communityMember/communities).
 * 3. Author creates a post in the community (POST /communityBbs/.../posts).
 * 4. Author creates a comment on the post (POST /communityBbs/.../comments).
 * 5. Another member attempts to delete the comment and must fail (403/permission
 *    error).
 * 6. Author deletes the comment successfully (soft-delete via DELETE endpoint).
 * 7. Deleting a non-existent comment id results in an error (404-like behavior).
 */
export async function test_api_comment_soft_delete_by_author(
  connection: api.IConnection,
) {
  // 1) Author: join as a new communityMember
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const authorUsername = RandomGenerator.alphaNumeric(8);
  const authorJoinBody = {
    email: authorEmail,
    username: authorUsername,
    password: "Passw0rd1",
    session_context: {
      href: "https://example.test/welcome",
      referrer: "https://example.test/",
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  const authorAuth: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(connection, {
      body: authorJoinBody,
    });
  typia.assert(authorAuth);

  // 2) Create a community as the author
  const unique = Date.now();
  const communitySlug = `test-community-${unique}`;
  const communityBody = {
    name: `Test Community ${unique}`,
    slug: communitySlug,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    visibility: "public",
    post_approval_required: false,
  } satisfies ICommunityBbsCommunity.ICreate;

  const community: ICommunityBbsCommunity =
    await api.functional.communityBbs.communityMember.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);
  TestValidator.equals(
    "created community slug matches request",
    community.slug,
    communitySlug,
  );

  // 3) Create a post in the community as the author
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    post_type: "text",
  } satisfies ICommunityBbsPost.ICreate;

  const post: ICommunityBbsPost =
    await api.functional.communityBbs.communityMember.communities.posts.create(
      connection,
      {
        communitySlug: community.slug,
        body: postBody,
      },
    );
  typia.assert(post);
  TestValidator.equals(
    "post.community matches created community",
    post.community.id,
    community.id,
  );

  // 4) Create a comment on the post as the author
  const commentBody = {
    body: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityBbsComment.ICreate;

  const comment: ICommunityBbsComment =
    await api.functional.communityBbs.communityMember.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentBody,
      },
    );
  typia.assert(comment);
  TestValidator.equals(
    "comment references correct post",
    comment.community_bbs_post_id,
    post.id,
  );
  TestValidator.equals(
    "comment community matches created community",
    comment.community.id,
    community.id,
  );

  // 5) Create a second member (otherMember) and attempt to delete the comment -> should fail
  const otherConn: api.IConnection = { ...connection, headers: {} };
  const otherJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(8),
    password: "Passw0rd1",
    session_context: {
      href: "https://example.test/welcome",
      referrer: "https://example.test/",
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  const otherAuth: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(otherConn, {
      body: otherJoinBody,
    });
  typia.assert(otherAuth);

  await TestValidator.error(
    "other member cannot delete author's comment",
    async () => {
      await api.functional.communityBbs.communityMember.comments.erase(
        otherConn,
        {
          commentId: comment.id,
        },
      );
    },
  );

  // 6) As the author, delete the comment (soft-delete) - expect success (no exception)
  await api.functional.communityBbs.communityMember.comments.erase(connection, {
    commentId: comment.id,
  });

  // 7) Attempt to delete a non-existent comment id -> expect error
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deleting non-existent comment should throw",
    async () => {
      await api.functional.communityBbs.communityMember.comments.erase(
        connection,
        {
          commentId: nonExistentId,
        },
      );
    },
  );
}
