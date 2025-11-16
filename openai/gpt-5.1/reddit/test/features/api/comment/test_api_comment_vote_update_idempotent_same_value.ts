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
 * Validate idempotent update behavior when a member user updates an existing
 * comment vote with the same vote_value.
 *
 * Business flow:
 *
 * 1. Platform admin prepares master data (community visibility level and post
 *    type).
 * 2. A member user joins (registration with initial auth token).
 * 3. The member user creates a community using the visibility level.
 * 4. The member user creates a post in that community using the post type.
 * 5. The member user creates a comment under that post.
 * 6. The member user casts an initial upvote (+1) on the comment.
 * 7. The member user updates the same vote record, again setting vote_value = +1.
 * 8. The test asserts that:
 *
 *    - The vote_value remains +1.
 *    - The vote id is unchanged between create and update.
 *    - The associated memberUser and comment ids are unchanged.
 *    - Created_at is unchanged; updated_at is not earlier than before and may or may
 *         not change.
 */
export async function test_api_comment_vote_update_idempotent_same_value(
  connection: api.IConnection,
) {
  // 1. Platform admin: join and own auth context
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "StrongP@ssw0rd",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Platform admin creates a community visibility level
  const visibilityCode = `public_${RandomGenerator.alphabets(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);

  // 3. Platform admin creates a post type
  const postTypeCode = `text_${RandomGenerator.alphabets(6)}`;
  const postTypeCreateBody = {
    code: postTypeCode,
    name: "Text Post",
    description: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      { body: postTypeCreateBody },
    );
  typia.assert(postType);

  // 4. Member user joins (registration with initial session & token)
  const memberEmail: string & tags.Format<"email"> =
    `${RandomGenerator.alphabets(8)}@member.example.com` as string &
      tags.Format<"email">;
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: memberEmail,
    password: "MemberP@ssw0rd",
    ip: "127.0.0.1",
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 5. Member user creates a community using previously created visibility level code
  const communityCreateBody = {
    identifier: `community_${RandomGenerator.alphabets(6)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 6. Member user creates a post in that community using the new post type
  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.paragraph({ sentences: 12 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 7. Member user creates a comment under the post
  const commentCreateBody = {
    body: RandomGenerator.paragraph({ sentences: 5 }),
    parentCommentId: undefined,
    renderingMode: "markdown",
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

  // 8. Member user creates an initial comment vote (+1) for that comment
  const initialVoteCreateBody = {
    community_platform_comment_id: comment.id,
    vote_value: 1,
  } satisfies ICommunityPlatformCommentVote.ICreate;

  const createdVote: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.commentVotes.create(
      connection,
      { body: initialVoteCreateBody },
    );
  typia.assert(createdVote);

  // Capture baseline fields for later comparison
  const createdVoteId = createdVote.id;
  const createdVoteValue = createdVote.vote_value;
  const createdMemberId = createdVote.memberUser.id;
  const createdCommentId = createdVote.comment.id;
  const createdAt = createdVote.created_at;
  const createdUpdatedAt = createdVote.updated_at;

  // Assert initial invariants from creation step
  TestValidator.equals("initial vote_value must be +1", createdVoteValue, 1);
  TestValidator.equals(
    "initial vote's memberUser.id must match memberAuthorized.id",
    createdMemberId,
    memberAuthorized.id,
  );
  TestValidator.equals(
    "initial vote's comment.id must match created comment id",
    createdCommentId,
    comment.id,
  );

  // 9. Member user updates the same comment vote with the same value (+1)
  const updateBodySameValue = {
    vote_value: 1,
  } satisfies ICommunityPlatformCommentVote.IUpdate;

  const updatedVote: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.commentVotes.update(
      connection,
      {
        commentVoteId: createdVoteId,
        body: updateBodySameValue,
      },
    );
  typia.assert(updatedVote);

  // 10. Idempotency assertions
  // 10.1 vote_value remains +1
  TestValidator.equals(
    "updated vote_value remains +1",
    updatedVote.vote_value,
    1,
  );

  // 10.2 id is identical to the one from create
  TestValidator.equals(
    "vote id is unchanged between create and update",
    updatedVote.id,
    createdVoteId,
  );

  // 10.3 memberUser and comment associations are unchanged
  TestValidator.equals(
    "vote's memberUser.id remains unchanged",
    updatedVote.memberUser.id,
    createdMemberId,
  );
  TestValidator.equals(
    "vote's comment.id remains unchanged",
    updatedVote.comment.id,
    createdCommentId,
  );

  // 10.4 created_at must remain identical; updated_at must not move backwards
  TestValidator.equals(
    "created_at remains unchanged after idempotent update",
    updatedVote.created_at,
    createdAt,
  );

  // Compare updated_at semantics (updated_at should be >= previous updated_at in string comparison
  // because both are ISO date-time strings). We ensure it is not earlier.
  const isUpdatedAtNotEarlier = updatedVote.updated_at >= createdUpdatedAt;
  TestValidator.predicate(
    "updated_at is not earlier than original updated_at",
    isUpdatedAtNotEarlier,
  );
}
