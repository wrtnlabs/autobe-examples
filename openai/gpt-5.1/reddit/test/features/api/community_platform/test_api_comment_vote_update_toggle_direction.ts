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

export async function test_api_comment_vote_update_toggle_direction(
  connection: api.IConnection,
) {
  // 1. Register platform admin (auto-authenticated by join)
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create visibility level as platform admin
  const visibilityCode = `vis_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityBody = {
    code: visibilityCode,
    name: `Visibility ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityBody },
    );
  typia.assert(visibilityLevel);

  // 3. Create post type as platform admin
  const postTypeCode = `pt_${RandomGenerator.alphaNumeric(8)}`;
  const postTypeBody = {
    code: postTypeCode,
    name: `PostType ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      { body: postTypeBody },
    );
  typia.assert(postType);

  // 4. Register member user (auto-authenticated by join)
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: memberPassword,
    ip: "127.0.0.1",
    href: "https://app.example.com/register",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberUser);

  // 5. (Re-)authenticate as member user via login to ensure context
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberPassword,
    ip: "127.0.0.1",
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLogin);

  // 6. Create community as member user referencing visibility level
  const communityBody = {
    identifier: `community_${RandomGenerator.alphaNumeric(8)}`,
    title: `Community ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
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

  // 7. Create post in that community using the configured post type
  const postBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  // 8. Create a comment under the post
  const commentBody = {
    body: RandomGenerator.paragraph({ sentences: 4 }),
    parentCommentId: undefined,
    renderingMode: "markdown",
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

  // 9. Create initial upvote (+1) on the comment
  const initialVoteBody = {
    community_platform_comment_id: comment.id,
    vote_value: 1,
  } satisfies ICommunityPlatformCommentVote.ICreate;

  const initialVote: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.commentVotes.create(
      connection,
      { body: initialVoteBody },
    );
  typia.assert(initialVote);

  // Capture invariants
  const initialVoteId = initialVote.id;
  const initialMemberUserId = initialVote.memberUser.id;
  const initialCommentId = initialVote.comment.id;
  const initialCreatedAt = initialVote.created_at;
  const initialUpdatedAt = initialVote.updated_at;

  TestValidator.equals("initial vote_value is +1", initialVote.vote_value, 1);

  // 10. Toggle the vote to -1 using update
  const updateBody = {
    vote_value: -1,
  } satisfies ICommunityPlatformCommentVote.IUpdate;

  const updatedVote: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.commentVotes.update(
      connection,
      {
        commentVoteId: initialVoteId,
        body: updateBody,
      },
    );
  typia.assert(updatedVote);

  // 11. Assertions on updated vote
  TestValidator.equals("vote toggled to -1", updatedVote.vote_value, -1);

  TestValidator.equals(
    "member user unchanged after vote update",
    updatedVote.memberUser.id,
    initialMemberUserId,
  );

  TestValidator.equals(
    "comment unchanged after vote update",
    updatedVote.comment.id,
    initialCommentId,
  );

  TestValidator.equals(
    "created_at remains the same after vote update",
    updatedVote.created_at,
    initialCreatedAt,
  );

  // Compare ISO date-time strings lexicographically for updated_at monotonicity
  const isUpdatedAtAdvanced = updatedVote.updated_at >= initialUpdatedAt;
  TestValidator.predicate(
    "updated_at is greater than or equal to initial updated_at",
    isUpdatedAtAdvanced,
  );
}
