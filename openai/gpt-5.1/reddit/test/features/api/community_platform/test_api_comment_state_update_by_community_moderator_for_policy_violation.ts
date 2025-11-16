import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentState";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";

/**
 * Community moderator updates a comment state to reflect a policy violation.
 *
 * Business goal:
 *
 * - Ensure a realistic multi-actor flow where:
 *
 *   - A platform admin configures primitive records (visibility level, post type).
 *   - A member user creates a community, a post, and a comment.
 *   - A community moderator, as a separate actor, updates the comment state to a
 *       policy-violation state through the dedicated moderation endpoint.
 * - Validate that the returned ICommunityPlatformCommentState matches the
 *   requested moderation decision and targets the correct comment.
 *
 * Detailed steps:
 *
 * 1. Platform admin joins and creates shared configuration:
 *
 *    - Join as platformAdmin (auth.platformAdmin.join) to obtain an
 *         ICommunityPlatformPlatformadmin.IAuthorized and establish admin
 *         auth.
 *    - Create a visibility level via
 *         communityPlatform.platformAdmin.communityVisibilityLevels.create.
 *    - Create a post type via communityPlatform.platformAdmin.postTypes.create.
 * 2. Member user joins and creates content to be moderated:
 *
 *    - Join as memberUser (auth.memberUser.join).
 *    - Create a community using the previously created visibility level code.
 *    - Create a text post in that community using the created post type.
 *    - Create a top-level comment under that post whose body clearly describes a
 *         policy violation (e.g., spam/hate speech) so it is reasonable to
 *         moderate it.
 * 3. Community moderator joins and updates the comment state:
 *
 *    - Join as communityModerator (auth.communityModerator.join), establishing
 *         moderator credentials.
 *    - Call communityPlatform.communityModerator.comments.state.update with:
 *
 *         - CommentId: the id of the created comment.
 *         - Body: ICommunityPlatformCommentState.IUpdate containing policy-violation
 *                   state values:
 *
 *                           - Visibility_state: e.g., "soft_removed".
 *                           - Lock_state: e.g., "locked_replies".
 *                           - Collapse_state: "collapsed".
 *                           - Moderation_state: e.g., "removed_policy_violation".
 *                           - Moderation_reason: human-readable explanation such as "Removed for hate
 *                                               speech / harassment policy violation".
 * 4. Assertions:
 *
 *    - Validate the platform admin, member user, moderator, community, post,
 *         comment, and comment-state responses structurally with typia.assert.
 *    - Confirm the updated comment state refers to the correct comment id.
 *    - Confirm all state fields on the response match the requested update values.
 *    - Sanity-check that updated_at is a non-empty ISO string (structurally
 *         guaranteed by typia, plus a simple predicate on length).
 */
export async function test_api_comment_state_update_by_community_moderator_for_policy_violation(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 1.3. Create visibility level
  const visibilityCreateBody = {
    code: `public_${RandomGenerator.alphabets(6)}`,
    name: "Public",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 1.4. Create post type
  const postTypeCreateBody = {
    code: `text_${RandomGenerator.alphabets(6)}`,
    name: "Text",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeCreateBody,
      },
    );
  typia.assert(postType);

  // 2. Member user joins
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2.2. Member creates a community
  const communityCreateBody = {
    identifier: `community_${RandomGenerator.alphabets(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 2.3. Member creates a post in that community
  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    url: undefined,
    image_uri: undefined,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 2.4. Member creates a comment that will be moderated
  const violatingCommentBodyText =
    "This comment intentionally violates the community policy (spam / hate speech) for test purposes.";

  const commentCreateBody = {
    body: violatingCommentBodyText,
    parentCommentId: undefined,
    renderingMode: "plainText",
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

  // 3. Community moderator joins (actor switch)
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://moderator.example.com/signup",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 3.3. Moderator updates comment state to reflect a policy violation
  const moderationReason =
    "Removed for hate speech / harassment policy violation in accordance with community rules.";

  const commentStateUpdateBody = {
    visibility_state: "soft_removed",
    lock_state: "locked_replies",
    collapse_state: "collapsed",
    moderation_state: "removed_policy_violation",
    moderation_reason: moderationReason,
  } satisfies ICommunityPlatformCommentState.IUpdate;

  const updatedState: ICommunityPlatformCommentState =
    await api.functional.communityPlatform.communityModerator.comments.state.update(
      connection,
      {
        commentId: comment.id,
        body: commentStateUpdateBody,
      },
    );
  typia.assert(updatedState);

  // 4. Assertions on returned state
  TestValidator.equals(
    "comment state refers to the correct comment",
    updatedState.comment_id,
    comment.id,
  );

  TestValidator.equals(
    "visibility_state reflects soft_removed",
    updatedState.visibility_state,
    commentStateUpdateBody.visibility_state,
  );

  TestValidator.equals(
    "lock_state reflects locked_replies",
    updatedState.lock_state,
    commentStateUpdateBody.lock_state,
  );

  TestValidator.equals(
    "collapse_state reflects collapsed",
    updatedState.collapse_state,
    commentStateUpdateBody.collapse_state,
  );

  TestValidator.equals(
    "moderation_state reflects removed_policy_violation",
    updatedState.moderation_state,
    commentStateUpdateBody.moderation_state,
  );

  TestValidator.equals(
    "moderation_reason is persisted",
    updatedState.moderation_reason,
    commentStateUpdateBody.moderation_reason,
  );

  TestValidator.predicate(
    "updated_at is a non-empty ISO date-time string",
    updatedState.updated_at.length > 0,
  );
}
