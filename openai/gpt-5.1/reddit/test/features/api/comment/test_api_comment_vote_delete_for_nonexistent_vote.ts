import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Verify behavior when a member user attempts to delete a non-existent vote on
 * a comment.
 *
 * Business context: A member user can vote on comments in a community. Removing
 * a vote should only succeed when an existing vote record is present for the
 * given comment and voteId combination. If the user attempts to delete a vote
 * that does not exist, the system must return an error instead of treating it
 * as a successful deletion.
 *
 * Scenario steps:
 *
 * 1. Register a new member user via POST /auth/memberUser/join and obtain an
 *    authenticated memberUser context for subsequent operations.
 * 2. Create a community using POST /communityPlatform/memberUser/communities.
 * 3. Join the created community using POST
 *    /communityPlatform/memberUser/communities/{communitySlug}/memberships.
 * 4. Create a post in the community via POST /communityPlatform/memberUser/posts.
 * 5. Create a top-level comment on the post via POST
 *    /communityPlatform/memberUser/posts/{postId}/comments.
 * 6. Generate a random UUID for voteId that does not correspond to any existing
 *    vote on this comment (no votes are created in this test).
 * 7. Attempt to delete the non-existent vote via DELETE
 *    /communityPlatform/memberUser/comments/{commentId}/votes/{voteId}.
 *
 * Validations:
 *
 * - The erase call must fail by throwing an error (HttpError) instead of
 *   succeeding silently.
 * - The test uses TestValidator.error to assert that the erase operation results
 *   in an error when the vote does not exist.
 */
export async function test_api_comment_vote_delete_for_nonexistent_vote(
  connection: api.IConnection,
) {
  // 1. Register a new member user (join as memberUser)
  const joinBody = typia.random<ICommunityPlatformMemberuser.IJoin>();

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create a community
  const communityCreateBody =
    typia.random<ICommunityPlatformCommunity.ICreate>();

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 3. Join the community using its slug
  const membershipBody = {
    role: "member",
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipBody,
      },
    );
  typia.assert(membership);

  // 4. Create a post in the community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 5. Create a top-level comment on the post
  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  // 6. Generate a random UUID for a non-existent vote
  const nonExistentVoteId = typia.random<string & tags.Format<"uuid">>();

  // 7. Attempt to delete the non-existent vote and assert error
  await TestValidator.error(
    "deleting non-existent comment vote should fail",
    async () => {
      await api.functional.communityPlatform.memberUser.comments.votes.erase(
        connection,
        {
          commentId: comment.id,
          voteId: nonExistentVoteId,
        },
      );
    },
  );
}
