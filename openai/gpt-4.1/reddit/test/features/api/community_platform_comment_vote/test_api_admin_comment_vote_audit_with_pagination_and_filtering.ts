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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentVote";

/**
 * Validate administrator comment vote auditing with complex filtering and
 * pagination.
 *
 * This test simulates the full end-to-end workflow for community comment vote
 * auditing from an administrator's perspective:
 *
 * - Registers an admin and a regular user (for vote-casting context)
 * - User creates a community, a post in that community, a comment on the post
 * - User casts both an upvote and a downvote (on separate comments for clarity)
 * - The admin retrieves comment votes via the PATCH
 *   /communityPlatform/admin/commentVotes endpoint
 * - Applies varying filters: by voter, by comment, by vote type, date ranges, and
 *   pagination controls
 * - Ensures filter logic works by verifying only scenario-created votes are
 *   visible using narrow criteria, and broad queries include both
 * - Validates that pagination (limit/page) yields correct quantities and
 *   consistency between different pages
 * - Success is determined by correct presence/absence of known vote records for
 *   each filter, and that pagination delivers expected page contents
 */
export async function test_api_admin_comment_vote_audit_with_pagination_and_filtering(
  connection: api.IConnection,
) {
  // 1. Register a regular user and authenticate as user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userOutput = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(2),
      href: "https://user-join.example.com/",
      referrer: "https://user-landing.example.com/",
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userOutput);

  // 2. Create a community as the user
  const communityOutput =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformCommunity.ICreate,
    });
  typia.assert(communityOutput);

  // 3. Create a post in the community
  const postOutput = await api.functional.communityPlatform.user.posts.create(
    connection,
    {
      body: {
        community_id: communityOutput.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        text_body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 2,
          sentenceMax: 5,
        }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(postOutput);

  // 4. Create two comments on the post (to allow upvote/downvote separately)
  const comment1 = await api.functional.communityPlatform.user.comments.create(
    connection,
    {
      body: {
        post_id: postOutput.id,
        body: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment1);

  const comment2 = await api.functional.communityPlatform.user.comments.create(
    connection,
    {
      body: {
        post_id: postOutput.id,
        body: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment2);

  // 5. User casts an upvote on comment1 and a downvote on comment2
  const vote1 = await api.functional.communityPlatform.user.commentVotes.create(
    connection,
    {
      body: {
        community_platform_comment_id: comment1.id,
        is_upvote: true,
      } satisfies ICommunityPlatformCommentVote.ICreate,
    },
  );
  typia.assert(vote1);

  const vote2 = await api.functional.communityPlatform.user.commentVotes.create(
    connection,
    {
      body: {
        community_platform_comment_id: comment2.id,
        is_upvote: false,
      } satisfies ICommunityPlatformCommentVote.ICreate,
    },
  );
  typia.assert(vote2);

  // 6. Register an admin and authenticate as admin (switch context for audit queries)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminOutput = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(2),
      href: "https://admin-join.example.com/",
      referrer: "https://admin-landing.example.com/",
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(adminOutput);

  // 7. As admin, audit votes with filters
  // Retrieve all votes (broadest possible)
  const broadAudit =
    await api.functional.communityPlatform.admin.commentVotes.index(
      connection,
      {
        body: {} satisfies ICommunityPlatformCommentVote.IRequest,
      },
    );
  typia.assert(broadAudit);
  TestValidator.predicate(
    "broad audit includes first vote",
    broadAudit.data.some((v) => v.id === vote1.id),
  );
  TestValidator.predicate(
    "broad audit includes second vote",
    broadAudit.data.some((v) => v.id === vote2.id),
  );

  // Filter by voter (user id)
  const auditByVoter =
    await api.functional.communityPlatform.admin.commentVotes.index(
      connection,
      {
        body: {
          user_id: userOutput.id,
        } satisfies ICommunityPlatformCommentVote.IRequest,
      },
    );
  typia.assert(auditByVoter);
  TestValidator.predicate(
    "audit by voter returns first vote",
    auditByVoter.data.some((v) => v.id === vote1.id),
  );
  TestValidator.predicate(
    "audit by voter returns second vote",
    auditByVoter.data.some((v) => v.id === vote2.id),
  );

  // Filter by comment (only vote1)
  const auditByComment1 =
    await api.functional.communityPlatform.admin.commentVotes.index(
      connection,
      {
        body: {
          comment_id: comment1.id,
        } satisfies ICommunityPlatformCommentVote.IRequest,
      },
    );
  typia.assert(auditByComment1);
  TestValidator.equals(
    "only vote1 is present when filtering for comment1",
    auditByComment1.data.length,
    1,
  );
  TestValidator.equals(
    "vote1 is present in comment1 filter",
    auditByComment1.data[0].id,
    vote1.id,
  );

  // Filter by comment (only vote2)
  const auditByComment2 =
    await api.functional.communityPlatform.admin.commentVotes.index(
      connection,
      {
        body: {
          comment_id: comment2.id,
        } satisfies ICommunityPlatformCommentVote.IRequest,
      },
    );
  typia.assert(auditByComment2);
  TestValidator.equals(
    "only vote2 is present when filtering for comment2",
    auditByComment2.data.length,
    1,
  );
  TestValidator.equals(
    "vote2 is present in comment2 filter",
    auditByComment2.data[0].id,
    vote2.id,
  );

  // Filter by is_upvote
  const auditUpvotes =
    await api.functional.communityPlatform.admin.commentVotes.index(
      connection,
      {
        body: {
          is_upvote: true,
        } satisfies ICommunityPlatformCommentVote.IRequest,
      },
    );
  typia.assert(auditUpvotes);
  TestValidator.predicate(
    "upvote audit contains vote1",
    auditUpvotes.data.some((v) => v.id === vote1.id),
  );
  TestValidator.predicate(
    "upvote audit does not contain vote2",
    !auditUpvotes.data.some((v) => v.id === vote2.id),
  );

  const auditDownvotes =
    await api.functional.communityPlatform.admin.commentVotes.index(
      connection,
      {
        body: {
          is_upvote: false,
        } satisfies ICommunityPlatformCommentVote.IRequest,
      },
    );
  typia.assert(auditDownvotes);
  TestValidator.predicate(
    "downvote audit contains vote2",
    auditDownvotes.data.some((v) => v.id === vote2.id),
  );
  TestValidator.predicate(
    "downvote audit does not contain vote1",
    !auditDownvotes.data.some((v) => v.id === vote1.id),
  );

  // Filter by created_from/created_to (using vote1's timestamp)
  const fromDate = vote1.created_at;
  const toDate = vote1.created_at;
  const auditByDate =
    await api.functional.communityPlatform.admin.commentVotes.index(
      connection,
      {
        body: {
          created_from: fromDate,
          created_to: toDate,
        } satisfies ICommunityPlatformCommentVote.IRequest,
      },
    );
  typia.assert(auditByDate);
  TestValidator.predicate(
    "audit by vote1's created_at finds vote1",
    auditByDate.data.some((v) => v.id === vote1.id),
  );

  // Pagination validation (set limit=1, check different pages)
  const pagedAudit1 =
    await api.functional.communityPlatform.admin.commentVotes.index(
      connection,
      {
        body: {
          limit: 1,
          page: 1,
        } satisfies ICommunityPlatformCommentVote.IRequest,
      },
    );
  typia.assert(pagedAudit1);
  TestValidator.equals(
    "pagination with limit 1 yields one result",
    pagedAudit1.data.length,
    1,
  );

  const pagedAudit2 =
    await api.functional.communityPlatform.admin.commentVotes.index(
      connection,
      {
        body: {
          limit: 1,
          page: 2,
        } satisfies ICommunityPlatformCommentVote.IRequest,
      },
    );
  typia.assert(pagedAudit2);
  TestValidator.equals(
    "pagination page 2 yields one result",
    pagedAudit2.data.length,
    1,
  );
  TestValidator.notEquals(
    "pagination results for limit=1 on pages 1 and 2 are different",
    pagedAudit1.data[0].id,
    pagedAudit2.data[0].id,
  );
}
