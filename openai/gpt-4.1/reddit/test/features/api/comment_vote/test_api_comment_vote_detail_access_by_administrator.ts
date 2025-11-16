import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";

/**
 * Test retrieval of detailed information for a specific comment vote record by
 * an administrator.
 *
 * 1. Register a new user.
 * 2. Login as the user.
 * 3. Create a comment (assume test post exists or use a random UUID for post_id).
 * 4. Create a vote (upvote or downvote) for the comment as the user.
 * 5. Register an administrator account.
 * 6. Login as the administrator (switch actor).
 * 7. Retrieve the created comment vote using the administrator endpoint.
 * 8. Validate that all audit and linkage fields are present (correct user, comment
 *    reference, timestamps, soft-delete audit field exists).
 * 9. Attempt to access this vote as a non-administrator to confirm access control
 *    (should fail).
 */
export async function test_api_comment_vote_detail_access_by_administrator(
  connection: api.IConnection,
) {
  // Register a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    },
  });
  typia.assert(user);

  // Login as user (for token context)
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "https://community.test/login",
      referrer: "https://community.test/welcome",
    },
  });

  // Create a comment (use a random UUID for post_id)
  const commentPostId = typia.random<string & tags.Format<"uuid">>();
  const createCommentBody = {
    post_id: commentPostId,
    body: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformComment.ICreate;
  const comment = await api.functional.communityPlatform.user.comments.create(
    connection,
    {
      body: createCommentBody,
    },
  );
  typia.assert(comment);

  // Create a comment vote as the above user
  const voteType = RandomGenerator.pick(["up", "down"] as const);
  const commentVoteBody = {
    community_platform_comment_id: comment.id,
    vote_type: voteType,
  } satisfies ICommunityPlatformCommentVote.ICreate;
  const vote = await api.functional.communityPlatform.user.commentVotes.create(
    connection,
    {
      body: commentVoteBody,
    },
  );
  typia.assert(vote);

  // Register an administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      business_status: null,
    },
  });
  typia.assert(admin);

  // Login as administrator
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://community.admin/login",
      referrer: "https://community.admin/dashboard",
    },
  });

  // Retrieve the comment vote as administrator
  const adminViewVote =
    await api.functional.communityPlatform.administrator.commentVotes.at(
      connection,
      {
        commentVoteId: vote.id,
      },
    );
  typia.assert(adminViewVote);

  // Validate linkage fields and audit fields
  TestValidator.equals("vote record id is correct", adminViewVote.id, vote.id);
  TestValidator.equals(
    "vote links to correct comment",
    adminViewVote.comment.id,
    comment.id,
  );
  TestValidator.equals(
    "vote links to correct user",
    adminViewVote.user.id,
    user.id,
  );
  TestValidator.predicate(
    "vote_type is valid",
    adminViewVote.vote_type === "up" || adminViewVote.vote_type === "down",
  );
  TestValidator.predicate(
    "created_at is ISO string",
    typeof adminViewVote.created_at === "string" &&
      !Number.isNaN(Date.parse(adminViewVote.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO string",
    typeof adminViewVote.updated_at === "string" &&
      !Number.isNaN(Date.parse(adminViewVote.updated_at)),
  );
  // Allow deleted_at to be null or string (validate shape)
  TestValidator.predicate(
    "deleted_at is nullable string",
    adminViewVote.deleted_at === null ||
      adminViewVote.deleted_at === undefined ||
      (typeof adminViewVote.deleted_at === "string" &&
        !Number.isNaN(Date.parse(adminViewVote.deleted_at))),
  );

  // Attempt to access as non-admin (should fail)
  // Switch token context back to user
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "https://community.test/login2",
      referrer: "https://community.test/welcome2",
    },
  });
  await TestValidator.error(
    "non-admin is forbidden to access admin vote detail",
    async () => {
      await api.functional.communityPlatform.administrator.commentVotes.at(
        connection,
        {
          commentVoteId: vote.id,
        },
      );
    },
  );
}
