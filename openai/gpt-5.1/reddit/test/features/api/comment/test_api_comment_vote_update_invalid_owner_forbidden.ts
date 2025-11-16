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
 * Ensure that a member user cannot effectively take over or change another
 * member user's comment vote.
 *
 * Business goal:
 *
 * - Comment votes belong to the member user who cast them.
 * - Even if another authenticated member user knows a commentVoteId, they must
 *   not be able to change the semantics of that vote.
 *
 * Scenario (adapted to SDK constraints and best practices):
 *
 * 1. Platform admin bootstrap
 *
 *    - Join as platformAdmin via POST /auth/platformAdmin/join.
 *    - Use that admin session to: a. Create a community visibility level via POST
 *         /communityPlatform/platformAdmin/communityVisibilityLevels using
 *         ICommunityPlatformCommunityVisibilityLevel.ICreate. b. Create a post
 *         type via POST /communityPlatform/platformAdmin/postTypes using
 *         ICommunityPlatformPostType.ICreate.
 * 2. Member user A (owner of the comment and vote)
 *
 *    - Call POST /auth/memberUser/join with
 *         ICommunityPlatformMemberuser.IJoinRequest to create MemberUser A. The
 *         join call also authenticates and sets the Authorization header for
 *         the connection.
 *    - Create a community via POST /communityPlatform/memberUser/communities using
 *         ICommunityPlatformCommunity.ICreate, referencing the visibility level
 *         created in step 1 by visibilityLevelCode.
 *    - Create a post in that community via POST /communityPlatform/memberUser/posts
 *         using ICommunityPlatformPost.ICreate, referencing the post type
 *         created in step 1 by post_type_id.
 *    - Create a comment under the post via POST
 *         /communityPlatform/memberUser/posts/{postId}/comments using
 *         ICommunityPlatformComment.ICreate.
 *    - Create a comment vote on that comment via POST
 *         /communityPlatform/memberUser/commentVotes using
 *         ICommunityPlatformCommentVote.ICreate with vote_value = +1. Capture
 *         the returned ICommunityPlatformCommentVote, including its id
 *         (commentVoteId) and memberUser summary (owner A).
 * 3. Member user B (unauthorized updater)
 *
 *    - Call POST /auth/memberUser/join again to create MemberUser B. This updates
 *         the connection's Authorization header to B's token.
 * 4. Unauthorized update attempt
 *
 *    - As MemberUser B (current connection context), call PUT
 *         /communityPlatform/memberUser/commentVotes/{commentVoteId} using
 *         api.functional.communityPlatform.memberUser.commentVotes.update with
 *         body ICommunityPlatformCommentVote.IUpdate attempting to flip
 *         vote_value, e.g. from +1 to -1.
 *
 *    Important notes:
 *
 *    - The SDK function is typed to return ICommunityPlatformCommentVote and does
 *         not expose raw HTTP status codes.
 *    - We are not allowed to assert specific HTTP status codes in tests, nor to
 *         deliberately construct type-invalid payloads.
 *    - Therefore, instead of checking for a 403, we validate the ownership
 *         invariants on the returned vote.
 * 5. Ownership invariance validation
 *
 *    - Validate that the vote returned from the update call is a
 *         ICommunityPlatformCommentVote via typia.assert().
 *    - Assert using TestValidator.equals that: a. The vote.id is still equal to the
 *         original commentVote.id. b. The vote.comment.id is still equal to the
 *         original comment.id. c. The vote.memberUser.id is still equal to
 *         MemberUser A's id, i.e., that the vote still belongs to the original
 *         owner and was not reassigned to MemberUser B.
 *    - These checks ensure that, regardless of how the underlying transport layer
 *         signals forbidden access, another member user cannot gain ownership
 *         of, or otherwise hijack, someone else's comment vote record.
 */
export async function test_api_comment_vote_update_invalid_owner_forbidden(
  connection: api.IConnection,
) {
  // 1. Platform admin bootstrap: join and create visibility level + post type
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "StrongP@ssw0rd!",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;
  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  const visibilityLevelBody = {
    code: `public-${RandomGenerator.alphaNumeric(6)}`,
    name: "Public Visibility",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;
  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityLevelBody },
    );
  typia.assert(visibilityLevel);

  const postTypeBody = {
    code: `text-${RandomGenerator.alphaNumeric(6)}`,
    name: "Text Post",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformPostType.ICreate;
  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      { body: postTypeBody },
    );
  typia.assert(postType);

  // 2. Member user A: join, create community, post, comment, vote
  const memberUserAJoinBody = {
    username: `userA_${RandomGenerator.alphaNumeric(6)}`,
    email: `userA+${RandomGenerator.alphaNumeric(8)}@example.com` as string &
      tags.Format<"email">,
    password: "UserA_StrongP@ssw0rd!",
    ip: "127.0.0.1",
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;
  const memberUserA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberUserAJoinBody,
    });
  typia.assert(memberUserA);

  const communityBody = {
    identifier: `community-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  const postBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.paragraph({ sentences: 10 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  const commentBody = {
    body: RandomGenerator.paragraph({ sentences: 4 }),
    parentCommentId: undefined,
    renderingMode: "markdown" as const,
  } satisfies ICommunityPlatformComment.ICreate;
  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentBody,
      },
    );
  typia.assert(comment);

  const voteCreateBody = {
    community_platform_comment_id: comment.id,
    vote_value: 1 as number &
      tags.Type<"int32"> &
      tags.Minimum<-1> &
      tags.Maximum<1>,
  } satisfies ICommunityPlatformCommentVote.ICreate;
  const originalVote: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.commentVotes.create(
      connection,
      { body: voteCreateBody },
    );
  typia.assert(originalVote);

  // 3. Member user B: join (switches connection auth to B)
  const memberUserBJoinBody = {
    username: `userB_${RandomGenerator.alphaNumeric(6)}`,
    email: `userB+${RandomGenerator.alphaNumeric(8)}@example.com` as string &
      tags.Format<"email">,
    password: "UserB_StrongP@ssw0rd!",
    ip: "127.0.0.1",
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;
  const memberUserB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberUserBJoinBody,
    });
  typia.assert(memberUserB);

  // 4. Unauthorized update attempt by B
  const voteUpdateBody = {
    vote_value: -1 as number &
      tags.Type<"int32"> &
      tags.Minimum<-1> &
      tags.Maximum<1>,
  } satisfies ICommunityPlatformCommentVote.IUpdate;
  const updatedVoteByB: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.commentVotes.update(
      connection,
      {
        commentVoteId: originalVote.id,
        body: voteUpdateBody,
      },
    );
  typia.assert(updatedVoteByB);

  // 5. Ownership invariance validation
  TestValidator.equals(
    "comment vote id must remain unchanged after unauthorized update attempt",
    updatedVoteByB.id,
    originalVote.id,
  );

  TestValidator.equals(
    "comment vote must still target the same comment after unauthorized update attempt",
    updatedVoteByB.comment.id,
    originalVote.comment.id,
  );

  TestValidator.equals(
    "comment vote owner must remain member user A even when updated by member user B",
    updatedVoteByB.memberUser.id,
    originalVote.memberUser.id,
  );
}
