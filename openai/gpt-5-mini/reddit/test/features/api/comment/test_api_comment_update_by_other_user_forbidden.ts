import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalComment";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalPost";
import type { ICommunityPortalSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalSubscription";

/**
 * Ensure that non-authors cannot update others' comments (authorization
 * negative case).
 *
 * Workflow:
 *
 * 1. Register author and otherUser accounts using POST /auth/member/join.
 * 2. Create a public community as author.
 * 3. Create a post as author in that community.
 * 4. Create a comment as author under the post.
 * 5. Attempt to update the comment as otherUser (expect 403 or 404) — verify via
 *    TestValidator.error.
 * 6. Attempt to update the comment unauthenticated (expect 401) — verify via
 *    TestValidator.error.
 * 7. Update the comment as the author to confirm rightful author can modify the
 *    comment; assert updated body.
 *
 * Notes on limitations:
 *
 * - The provided SDK does not include GET endpoints for re-fetching an individual
 *   comment or an audit API. Therefore, this test verifies the authorization
 *   behavior by (a) asserting that unauthorized attempts fail and (b)
 *   confirming the author can successfully perform the update. Audit
 *   verification is not possible with the available functions.
 */
export async function test_api_comment_update_by_other_user_forbidden(
  connection: api.IConnection,
) {
  // Prepare isolated connections for each actor. Do NOT touch connection.headers directly.
  const authorConn: api.IConnection = { ...connection, headers: {} };
  const otherConn: api.IConnection = { ...connection, headers: {} };
  const guestConn: api.IConnection = { ...connection, headers: {} };

  // Register author
  const authorBody = {
    username: `author_${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const author: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(authorConn, { body: authorBody });
  typia.assert(author);

  // Register other user
  const otherBody = {
    username: `other_${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const otherUser: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(otherConn, { body: otherBody });
  typia.assert(otherUser);

  // Create a public community as the author
  const communityBody = {
    name: RandomGenerator.name(2),
    slug: `c-${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_private: false,
    visibility: "public",
  } satisfies ICommunityPortalCommunity.ICreate;

  const community: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(authorConn, {
      body: communityBody,
    });
  typia.assert(community);

  // Create a text post as the author
  const postBody = {
    community_id: community.id,
    post_type: "text",
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPortalPost.ICreate.IText;

  const post: ICommunityPortalPost =
    await api.functional.communityPortal.member.posts.create(authorConn, {
      body: postBody,
    });
  typia.assert(post);

  // Create a comment as the author
  const commentCreateBody = {
    post_id: post.id,
    parent_comment_id: null,
    body: "Original comment body",
  } satisfies ICommunityPortalComment.ICreate;

  const comment: ICommunityPortalComment =
    await api.functional.communityPortal.member.posts.comments.create(
      authorConn,
      {
        postId: post.id,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  // Attempt update as other user: must throw (403 Forbidden or 404 Not Found)
  // IMPORTANT: The callback is async, so TestValidator.error must be awaited.
  await TestValidator.error(
    "other user cannot update someone else's comment",
    async () => {
      await api.functional.communityPortal.member.posts.comments.update(
        otherConn,
        {
          postId: post.id,
          commentId: comment.id,
          body: {
            body: "Hacked body by other user",
          } satisfies ICommunityPortalComment.IUpdate,
        },
      );
    },
  );

  // Unauthenticated attempt: expect 401 Unauthorized
  await TestValidator.error(
    "unauthenticated user cannot update comment",
    async () => {
      await api.functional.communityPortal.member.posts.comments.update(
        guestConn,
        {
          postId: post.id,
          commentId: comment.id,
          body: {
            body: "Hacked by guest",
          } satisfies ICommunityPortalComment.IUpdate,
        },
      );
    },
  );

  // Finally, author updates the comment successfully
  const updated: ICommunityPortalComment =
    await api.functional.communityPortal.member.posts.comments.update(
      authorConn,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          body: "Author updated body",
        } satisfies ICommunityPortalComment.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "author can update their own comment",
    updated.body,
    "Author updated body",
  );
}
