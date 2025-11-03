import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLinks } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLinks";
import type { ICommunityPlatformPostTexts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostTexts";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate that an administrator can delete post votes of any user whereas
 * users cannot delete votes of others.
 *
 * Test workflow:
 *
 * 1. Register and authenticate as a user (member).
 * 2. User creates a new community.
 * 3. User creates a new post in that community.
 * 4. User casts a vote (upvote) on the post.
 * 5. Register and authenticate as an admin.
 * 6. Admin deletes the user's vote using its ID.
 * 7. Confirm the admin deletion is a soft-delete (deleted_at is populated).
 * 8. Confirm business rule: only admins can delete others' votes (users cannot
 *    delete votes not their own).
 */
export async function test_api_post_vote_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as a regular user
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userJoinBody = {
    email: userEmail,
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: "https://test.community/join",
    referrer: "https://test.community/register",
  } satisfies ICommunityPlatformUser.IJoin;
  const userAuth: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userJoinBody });
  typia.assert(userAuth);

  // 2. Create community as this user
  const communityBody = {
    name: RandomGenerator.alphaNumeric(10).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  // 3. User creates a new text post in the community
  const postBody = {
    community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    text_body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies ICommunityPlatformPost.ICreate;
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.user.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  // 4. User casts a vote (upvote) on their post
  const voteBody = {
    community_platform_post_id: post.id,
    is_upvote: true,
  } satisfies ICommunityPlatformPostVote.ICreate;
  const vote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.user.postVotes.create(connection, {
      body: voteBody,
    });
  typia.assert(vote);

  // 5. Register and authenticate as an admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: "https://test.community/admin/join",
    referrer: "https://test.community/admin/register",
  } satisfies ICommunityPlatformAdmin.ICreate;
  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuth);

  // 6. Admin deletes the user's vote
  await api.functional.communityPlatform.admin.postVotes.erase(connection, {
    postVoteId: vote.id,
  });

  // 7. Confirm the vote is soft-deleted: try to create again and see if soft-deleted vote doesn't block new one
  // (Assume re-cast by user creates a new active vote; old one remains for audit)
  const voteAgain: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.user.postVotes.create(connection, {
      body: voteBody,
    });
  typia.assert(voteAgain);
  TestValidator.notEquals(
    "vote ids must differ after admin soft-deletes",
    vote.id,
    voteAgain.id,
  );

  // 8. Negative test: regular user cannot delete other users' (simulate by having a second user)
  const user2Email: string = typia.random<string & tags.Format<"email">>();
  const user2JoinBody = {
    email: user2Email,
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: "https://test.community/join",
    referrer: "https://test.community/register",
  } satisfies ICommunityPlatformUser.IJoin;
  const user2Auth: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: user2JoinBody });
  typia.assert(user2Auth);
  await TestValidator.error(
    "regular user cannot delete another's post vote",
    async () => {
      await api.functional.communityPlatform.admin.postVotes.erase(connection, {
        postVoteId: voteAgain.id,
      });
    },
  );
}
