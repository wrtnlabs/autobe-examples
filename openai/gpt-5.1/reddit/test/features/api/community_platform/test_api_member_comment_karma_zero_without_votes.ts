import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";
import type { ICommunityPlatformUserCommentKarmas } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserCommentKarmas";

/**
 * Verify that a member user's aggregated comment karma is zero when they have
 * created comments but have not received any comment votes.
 *
 * Business flow:
 *
 * 1. Register a member user.
 * 2. Register a platform admin and create a text post type.
 * 3. Login as the member user and create a community.
 * 4. Create a text post in that community.
 * 5. Create at least one comment on the post (no votes are ever cast).
 * 6. Optionally create a subscription to the community for realism.
 * 7. Fetch /communityPlatform/memberUsers/{memberUserId}/commentKarmas.
 * 8. Assert that comment_karma is 0 and the record is linked to the member.
 */
export async function test_api_member_comment_karma_zero_without_votes(
  connection: api.IConnection,
) {
  // 1. Register member user
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://example.com/join/member",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberId = memberAuthorized.id;

  // 2. Register platform admin and create a post type
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: adminEmail,
    password: adminPassword,
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://example.com/join/admin",
    referrer: "https://example.com/admin-landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const postTypeCreateBody = {
    code: `text-${RandomGenerator.alphaNumeric(8)}`,
    name: "Text Posts",
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      { body: postTypeCreateBody },
    );
  typia.assert(postType);

  // 3. Login as the member user (switch actor)
  const memberLoginBody = {
    identifier: memberEmail,
    password: memberPassword,
    ip: null,
    href: undefined,
    referrer: undefined,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberAuthorizedAfterLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedAfterLogin);

  // 4. Create a community as member user
  const communityCreateBody = {
    identifier: `karma-zero-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: "public",
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 5. Create a text post in that community
  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  TestValidator.equals(
    "post community matches created community",
    post.community.id,
    community.id,
  );

  // 6. Create at least one comment under the post, but no votes
  const commentCreateBody = {
    body: RandomGenerator.paragraph({ sentences: 5 }),
    parentCommentId: undefined,
    renderingMode: "markdown" as const,
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

  TestValidator.equals(
    "comment belongs to created post",
    comment.post.id,
    post.id,
  );

  // 7. Optionally create a subscription to the community
  const subscriptionCreateBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      { body: subscriptionCreateBody },
    );
  typia.assert(subscription);

  TestValidator.equals(
    "subscription community matches",
    subscription.community.id,
    community.id,
  );

  // 8. Fetch comment karma aggregate for the member user
  const karma: ICommunityPlatformUserCommentKarmas =
    await api.functional.communityPlatform.memberUsers.commentKarmas.at(
      connection,
      { memberUserId: memberId },
    );
  typia.assert(karma);

  // 9. Business assertions on karma aggregate
  TestValidator.equals(
    "karma aggregate belongs to member user",
    karma.member_user_id,
    memberId,
  );

  TestValidator.equals(
    "comment karma should be zero when no votes exist",
    karma.comment_karma,
    0,
  );

  const createdAt = new Date(karma.created_at);
  const updatedAt = new Date(karma.updated_at);

  TestValidator.predicate(
    "karma timestamps should be valid and updatedAt >= createdAt",
    createdAt instanceof Date &&
      !Number.isNaN(createdAt.getTime()) &&
      updatedAt instanceof Date &&
      !Number.isNaN(updatedAt.getTime()) &&
      updatedAt.getTime() >= createdAt.getTime(),
  );
}
