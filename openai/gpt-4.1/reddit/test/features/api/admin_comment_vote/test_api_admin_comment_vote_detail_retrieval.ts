import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLinks } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLinks";
import type { ICommunityPlatformPostTexts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostTexts";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validates the admin's ability to retrieve details of a specific comment vote
 * by UUID.
 *
 * Test steps:
 *
 * 1. Register an admin and a regular user (user will perform comment and vote
 *    actions).
 * 2. User creates a community.
 * 3. User creates a post within the community.
 * 4. User adds a comment to the post.
 * 5. User votes (upvote) on the comment.
 * 6. Admin fetches the detailed vote information via
 *    /communityPlatform/admin/commentVotes/{commentVoteId}.
 *
 *    - Assert all key fields: vote id, user id, comment id, vote direction,
 *         timestamps (created_at/updated_at), and null deleted_at (active
 *         state).
 * 7. Edge case: Attempt to retrieve a non-existent vote (random UUID) and expect
 *    error.
 * 8. Edge case: Soft-delete scenario – simulate or skip as there is no API to
 *    delete votes; document as a future step or placeholder.
 */
export async function test_api_admin_comment_vote_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Register an admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminResult = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: "https://admin.test/join",
      referrer: "https://admin.test/ref",
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(adminResult);
  // SDK auto-switches token on connection so admin context is set for admin-only APIs.

  // 2. Register a user
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userResult = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      href: "https://user.test/join",
      referrer: "https://user.test/ref",
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userResult);
  // SDK auto-switches token on connection; now acting as normal user.

  // 3. User creates a community
  const communityResult =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies ICommunityPlatformCommunity.ICreate,
    });
  typia.assert(communityResult);

  // 4. User creates a post
  const postResult = await api.functional.communityPlatform.user.posts.create(
    connection,
    {
      body: {
        community_id: communityResult.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        text_body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 10,
          sentenceMax: 18,
        }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(postResult);

  // 5. User creates a comment
  const commentResult =
    await api.functional.communityPlatform.user.comments.create(connection, {
      body: {
        post_id: postResult.id,
        body: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(commentResult);

  // 6. User votes (upvote) on the comment
  const voteResult =
    await api.functional.communityPlatform.user.commentVotes.create(
      connection,
      {
        body: {
          community_platform_comment_id: commentResult.id,
          is_upvote: true,
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert(voteResult);
  // Store all ground truth for later admin verification

  // Switch context to admin (login is handled by token set in last admin join)
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password:
        adminResult.email === adminEmail
          ? adminResult.token.refresh
          : RandomGenerator.alphaNumeric(12),
      display_name: adminResult.display_name,
      href: "https://admin.test/login",
      referrer: "https://admin.test/loginref",
    } satisfies ICommunityPlatformAdmin.ICreate,
  });

  // 7. Admin fetches the vote detail
  const adminVote =
    await api.functional.communityPlatform.admin.commentVotes.at(connection, {
      commentVoteId: voteResult.id,
    });
  typia.assert(adminVote);
  TestValidator.equals("vote id matches", adminVote.id, voteResult.id);
  TestValidator.equals(
    "voted user matches",
    adminVote.community_platform_user_id,
    voteResult.community_platform_user_id,
  );
  TestValidator.equals(
    "voted comment matches",
    adminVote.community_platform_comment_id,
    commentResult.id,
  );
  TestValidator.equals("upvote flag matches", adminVote.is_upvote, true);
  TestValidator.equals(
    "created_at matches",
    adminVote.created_at,
    voteResult.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    adminVote.updated_at,
    voteResult.updated_at,
  );
  TestValidator.equals(
    "vote is active (not soft-deleted)",
    adminVote.deleted_at,
    null,
  );

  // 8. Edge case: retrieve non-existent vote (random uuid)
  await TestValidator.error(
    "fetching non-existent vote must fail",
    async () => {
      await api.functional.communityPlatform.admin.commentVotes.at(connection, {
        commentVoteId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
  // 9. Edge case: Soft-deleted vote fetch (skipped; can't trigger via public API)
}
