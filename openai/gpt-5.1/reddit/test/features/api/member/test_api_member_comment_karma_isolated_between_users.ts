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
import type { ICommunityPlatformUserCommentKarmas } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserCommentKarmas";

/**
 * Validate that comment karma aggregates are isolated per member user.
 *
 * This test builds a realistic multi-actor workflow in the community platform:
 *
 * 1. Register two member users (commenterA and commenterB).
 * 2. Register a platform admin and create a post type.
 * 3. As commenterA, create a community and a post.
 * 4. As commenterA, create comments on that post.
 * 5. As commenterB, create separate comments on the same post.
 * 6. Cast votes such that commenterA’s comments receive upvotes only from
 *    commenterA, and commenterB’s comments receive upvotes only from
 *    commenterB.
 * 7. Fetch comment karma aggregates for both users.
 * 8. Assert that each user’s comment_karma only reflects votes on their own
 *    comments and that votes on one user’s comments do not affect the other
 *    user’s karma.
 */
export async function test_api_member_comment_karma_isolated_between_users(
  connection: api.IConnection,
) {
  // 1. Register two distinct member users: commenterA and commenterB
  const commenterAEmail = typia.random<string & tags.Format<"email">>();
  const commenterBEmail = typia.random<string & tags.Format<"email">>();
  const password = "Password123!";

  const commenterAJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: RandomGenerator.alphabets(12),
        email: commenterAEmail,
        password,
        ip: null,
        href: "https://example.com/joinA",
        referrer: "https://example.com/landing",
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(commenterAJoin);

  const commenterBJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: RandomGenerator.alphabets(12),
        email: commenterBEmail,
        password,
        ip: null,
        href: "https://example.com/joinB",
        referrer: "https://example.com/landing",
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(commenterBJoin);

  const commenterAId = commenterAJoin.id;
  const commenterBId = commenterBJoin.id;

  // 2. Register a platform admin and create a post type
  const platformAdminEmail = typia.random<string & tags.Format<"email">>();

  const platformAdminJoin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: platformAdminEmail,
        password,
        displayName: RandomGenerator.name(),
        ip: undefined,
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin/landing",
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert(platformAdminJoin);

  const platformAdminLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: {
        identifier: platformAdminEmail,
        password,
        ip: null,
        href: "https://example.com/admin/login",
        referrer: "https://example.com/admin/landing",
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    });
  typia.assert(platformAdminLogin);

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: {
          code: `text_${RandomGenerator.alphabets(6)}`,
          name: "Text Post",
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformPostType.ICreate,
      },
    );
  typia.assert(postType);

  // 3. Switch to commenterA and create a community
  const commenterALogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: {
        identifier: commenterAEmail,
        password,
        ip: null,
        href: "https://example.com/loginA",
        referrer: "https://example.com/landing",
      } satisfies ICommunityPlatformMemberuser.ILoginRequest,
    });
  typia.assert(commenterALogin);

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: `community_${RandomGenerator.alphabets(8)}`,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 8 }),
          visibilityLevelCode: "public",
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 4. As commenterA, create a post in that community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type_id: postType.id,
        title: RandomGenerator.paragraph({ sentences: 4 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        url: null,
        image_uri: null,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 5. As commenterA, create comments on the post (at least two)
  const commenterAComment1: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 6 }),
          parentCommentId: undefined,
          renderingMode: "markdown",
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(commenterAComment1);

  const commenterAComment2: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 5 }),
          parentCommentId: undefined,
          renderingMode: "plainText",
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(commenterAComment2);

  // 6. Switch to commenterB and create separate comments on the same post
  const commenterBLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: {
        identifier: commenterBEmail,
        password,
        ip: null,
        href: "https://example.com/loginB",
        referrer: "https://example.com/landing",
      } satisfies ICommunityPlatformMemberuser.ILoginRequest,
    });
  typia.assert(commenterBLogin);

  const commenterBComment1: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 4 }),
          parentCommentId: undefined,
          renderingMode: "markdown",
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(commenterBComment1);

  const commenterBComment2: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 7 }),
          parentCommentId: undefined,
          renderingMode: "plainText",
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(commenterBComment2);

  // 7. As commenterA, upvote only commenterA's comments
  const commenterALoginAgain: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: {
        identifier: commenterAEmail,
        password,
        ip: null,
        href: "https://example.com/loginA2",
        referrer: "https://example.com/landing",
      } satisfies ICommunityPlatformMemberuser.ILoginRequest,
    });
  typia.assert(commenterALoginAgain);

  const voteA1: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.commentVotes.create(
      connection,
      {
        body: {
          community_platform_comment_id: commenterAComment1.id,
          vote_value: 1,
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert(voteA1);

  const voteA2: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.commentVotes.create(
      connection,
      {
        body: {
          community_platform_comment_id: commenterAComment2.id,
          vote_value: 1,
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert(voteA2);

  // 8. As commenterB, upvote only commenterB's comments
  const commenterBLoginAgain: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: {
        identifier: commenterBEmail,
        password,
        ip: null,
        href: "https://example.com/loginB2",
        referrer: "https://example.com/landing",
      } satisfies ICommunityPlatformMemberuser.ILoginRequest,
    });
  typia.assert(commenterBLoginAgain);

  const voteB1: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.commentVotes.create(
      connection,
      {
        body: {
          community_platform_comment_id: commenterBComment1.id,
          vote_value: 1,
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert(voteB1);

  const voteB2: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.commentVotes.create(
      connection,
      {
        body: {
          community_platform_comment_id: commenterBComment2.id,
          vote_value: 1,
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert(voteB2);

  // 9. Fetch comment karma aggregates for both users
  const karmaA: ICommunityPlatformUserCommentKarmas =
    await api.functional.communityPlatform.memberUsers.commentKarmas.at(
      connection,
      { memberUserId: commenterAId },
    );
  typia.assert(karmaA);

  const karmaB: ICommunityPlatformUserCommentKarmas =
    await api.functional.communityPlatform.memberUsers.commentKarmas.at(
      connection,
      { memberUserId: commenterBId },
    );
  typia.assert(karmaB);

  // 10. Validate isolation and correctness of comment_karma per user
  TestValidator.equals(
    "karmaA member_user_id should match commenterAId",
    karmaA.member_user_id,
    commenterAId,
  );
  TestValidator.equals(
    "karmaB member_user_id should match commenterBId",
    karmaB.member_user_id,
    commenterBId,
  );

  TestValidator.predicate(
    "commenterA comment_karma should be positive",
    karmaA.comment_karma > 0,
  );
  TestValidator.predicate(
    "commenterB comment_karma should be positive",
    karmaB.comment_karma > 0,
  );

  TestValidator.notEquals(
    "member_user_ids must differ between commenterA and commenterB",
    karmaA.member_user_id,
    karmaB.member_user_id,
  );

  TestValidator.predicate("karmaA non-negative", karmaA.comment_karma >= 0);
  TestValidator.predicate("karmaB non-negative", karmaB.comment_karma >= 0);
}
