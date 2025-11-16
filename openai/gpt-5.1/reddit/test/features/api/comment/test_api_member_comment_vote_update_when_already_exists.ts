import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";

/**
 * Validate upsert behavior of comment votes for a member user.
 *
 * Business goal
 *
 * - Ensure that POST /communityPlatform/memberUser/commentVotes behaves as an
 *   upsert on the (memberUser, comment) pair: a second vote on the same comment
 *   by the same member updates the existing vote record instead of inserting a
 *   new row.
 *
 * High-level flow
 *
 * 1. Create and authenticate a platform admin for master-data seeding.
 * 2. Seed one community visibility level.
 * 3. Seed one post type.
 * 4. Create and authenticate a member user.
 * 5. As the member user, create a community referencing the seeded visibility
 *    level.
 * 6. As the member user, create a post in that community referencing the seeded
 *    post type.
 * 7. As the member user, create a comment under that post.
 * 8. As the same member user, vote +1 on the comment.
 * 9. As the same member user again, vote -1 on the same comment.
 * 10. Assert that the second vote response reuses the same id with updated fields.
 */
export async function test_api_member_comment_vote_update_when_already_exists(
  connection: api.IConnection,
) {
  // 1. Platform admin join (implicitly authenticates platformAdmin actor)
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(
    platformAdminAuthorized,
  );

  // 2. Seed a community visibility level
  const visibilityCode = `vis_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public visibility",
    description: "Visibility level for public communities in tests",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);

  // 3. Seed a post type
  const postTypeCode = `type_${RandomGenerator.alphaNumeric(8)}`;
  const postTypeCreateBody = {
    code: postTypeCode,
    name: "Text post",
    description: "Simple text post type for tests",
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      { body: postTypeCreateBody },
    );
  typia.assert<ICommunityPlatformPostType>(postType);

  // 4. Member user join (implicitly authenticates memberUser actor)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 5. Member user login once more to ensure login endpoint is exercised
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberAuthorizedAfterLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(
    memberAuthorizedAfterLogin,
  );

  // 6. Create a community as member user
  const communityCreateBody = {
    identifier: `community_${RandomGenerator.alphaNumeric(8)}`,
    title: "Test Community for Comment Vote Upsert",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 7. Create a post in that community
  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 6,
    }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert<ICommunityPlatformPost>(post);

  // 8. Create a comment under that post
  const commentCreateBody = {
    body: RandomGenerator.paragraph({ sentences: 4 }),
    parentCommentId: undefined,
    renderingMode: "markdown", // allowed literal
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentCreateBody,
      },
    );
  typia.assert<ICommunityPlatformComment>(comment);

  // 9. First vote: +1 (upvote)
  const firstVoteBody = {
    community_platform_comment_id: comment.id,
    vote_value: 1,
  } satisfies ICommunityPlatformCommentVote.ICreate;

  const firstVote: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.commentVotes.create(
      connection,
      { body: firstVoteBody },
    );
  typia.assert<ICommunityPlatformCommentVote>(firstVote);

  // Basic sanity checks for first vote
  TestValidator.equals(
    "first vote value should be +1",
    firstVote.vote_value,
    1,
  );
  TestValidator.equals(
    "first vote memberUser id should match authenticated member",
    firstVote.memberUser.id,
    memberAuthorizedAfterLogin.id,
  );
  TestValidator.equals(
    "first vote comment id should match created comment",
    firstVote.comment.id,
    comment.id,
  );

  // 10. Second vote: -1 (downvote) on the same comment by same member
  const secondVoteBody = {
    community_platform_comment_id: comment.id,
    vote_value: -1,
  } satisfies ICommunityPlatformCommentVote.ICreate;

  const secondVote: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.commentVotes.create(
      connection,
      { body: secondVoteBody },
    );
  typia.assert<ICommunityPlatformCommentVote>(secondVote);

  // Assertions for upsert behavior
  TestValidator.equals(
    "second vote should reuse same id (upsert semantics)",
    secondVote.id,
    firstVote.id,
  );

  TestValidator.equals(
    "created_at should remain unchanged between first and second vote",
    secondVote.created_at,
    firstVote.created_at,
  );

  TestValidator.equals(
    "second vote memberUser id should remain the same",
    secondVote.memberUser.id,
    firstVote.memberUser.id,
  );

  TestValidator.equals(
    "second vote comment id should remain the same",
    secondVote.comment.id,
    firstVote.comment.id,
  );

  TestValidator.equals(
    "second vote value should be -1 (downvote)",
    secondVote.vote_value,
    -1,
  );

  // Verify that updated_at changed and is later (lexicographically, as ISO strings)
  TestValidator.predicate(
    "updated_at of second vote should be later than first vote",
    () => secondVote.updated_at > firstVote.updated_at,
  );
}
