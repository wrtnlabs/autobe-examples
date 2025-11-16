import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentState";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";

export async function test_api_comment_state_retrieval_by_moderator_for_visible_comment(
  connection: api.IConnection,
) {
  // 1. Join as a member user who will author the post and comment
  const memberJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://client.example.com/signup",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create a community as the member user
  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphabets(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: "public",
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 3. Create a post under that community
  const postCreateBody = {
    community_id: community.id,
    post_type_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.paragraph({ sentences: 5 }),
    url: undefined,
    image_uri: undefined,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 4. Create a comment under the post
  const commentCreateBody = {
    body: RandomGenerator.paragraph({ sentences: 4 }),
    parentCommentId: undefined,
    renderingMode: "plainText" as const,
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

  // 5. Register a community moderator
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://client.example.com/moderator/signup",
    referrer: "https://client.example.com/moderator/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 6. Optionally perform an explicit moderator login to demonstrate actor switching
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      identifier: moderatorJoinBody.email,
      password: moderatorJoinBody.password,
      ip: null,
      href: "https://client.example.com/moderator/login",
      referrer: "https://client.example.com/moderator/login-referrer",
    } satisfies ICommunityPlatformCommunityModerator.ILogin,
  });

  // 7. As communityModerator, retrieve the comment state
  const state: ICommunityPlatformCommentState =
    await api.functional.communityPlatform.communityModerator.comments.state.at(
      connection,
      {
        commentId: comment.id,
      },
    );
  typia.assert(state);

  // 8. Business-logic validations
  // comment_id should match the created comment
  TestValidator.equals(
    "comment state should refer to the created comment id",
    state.comment_id,
    comment.id,
  );

  // visibility_state should be a non-empty string (assumed visible by default)
  TestValidator.predicate(
    "visibility_state should be a non-empty string",
    typeof state.visibility_state === "string" &&
      state.visibility_state.length > 0,
  );

  // lock_state should be a non-empty string; newly created comment should allow replies
  TestValidator.predicate(
    "lock_state should be a non-empty string",
    typeof state.lock_state === "string" && state.lock_state.length > 0,
  );

  // collapse_state should be a non-empty string
  TestValidator.predicate(
    "collapse_state should be a non-empty string",
    typeof state.collapse_state === "string" && state.collapse_state.length > 0,
  );

  // moderation_state should be a non-empty string and ideally represent no active moderation
  TestValidator.predicate(
    "moderation_state should be a non-empty string",
    typeof state.moderation_state === "string" &&
      state.moderation_state.length > 0,
  );

  // created_at and updated_at: already validated as date-time strings by typia.assert
  // additionally check that created_at <= updated_at
  const createdAt = new Date(state.created_at).getTime();
  const updatedAt = new Date(state.updated_at).getTime();

  TestValidator.predicate(
    "comment state created_at should not be later than updated_at",
    createdAt <= updatedAt,
  );
}
