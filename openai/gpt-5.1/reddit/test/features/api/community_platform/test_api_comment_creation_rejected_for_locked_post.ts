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
 * Validate comment creation behaviors around community posts using only
 * available memberUser APIs.
 *
 * Business intent and adjusted scenario:
 *
 * - The original requirement was to ensure that comments cannot be created on a
 *   post that has been locked by administrative actions.
 * - However, the provided SDK functions do not include any admin or post-lock
 *   mutation endpoints, so we cannot actually switch a post into a locked
 *   state.
 * - To keep the test fully compilable and realistic, we instead:
 *
 *   1. Cover the happy path: an authenticated community member can successfully
 *        create a comment on an unlocked post.
 *   2. Cover a negative path that is enforceable with available APIs: attempting to
 *        create a comment with a logically invalid parent relationship
 *        (parentCommentId not belonging to the target post) should fail and
 *        surface a business-rule error.
 *
 * High-level flow implemented in this test:
 *
 * 1. Register a member user (join) which also authenticates the session.
 * 2. Create a community as that member user.
 * 3. Create a membership for the user in the community.
 * 4. Create a post in that community and assert it is not locked.
 * 5. Create a top-level comment on that post and assert it succeeds.
 * 6. Create a second post in the same community.
 * 7. Attempt to create a comment on the second post using a parentCommentId that
 *    does not belong to that post (a random UUID), expecting a business-rule
 *    error.
 *
 * This validates that:
 *
 * - The normal comment creation flow works when the post is unlocked.
 * - The comment creation endpoint enforces basic thread integrity rules when
 *   parentCommentId is inconsistent with the target post, rejecting the request
 *   using a domain error.
 */
export async function test_api_comment_creation_rejected_for_locked_post(
  connection: api.IConnection,
) {
  // 1. Register a member user and obtain an authorized session
  const joinInput = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinInput,
    });
  typia.assert(member);

  // 2. Create a community owned by this member user
  const communityCreate = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreate },
    );
  typia.assert(community);

  // 3. Create a membership for the member user in this community
  const membershipCreate = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipCreate,
      },
    );
  typia.assert(membership);

  // 4. Create an initial post in the community and assert it is unlocked
  const postCreate = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 10 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreate,
    });
  typia.assert(post);

  TestValidator.predicate(
    "created post should not be locked by default",
    post.is_locked === false,
  );

  // 5. Create a top-level comment on the unlocked post (happy path)
  const commentCreate = {
    content: RandomGenerator.paragraph({ sentences: 4 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id as string & tags.Format<"uuid">,
        body: commentCreate,
      },
    );
  typia.assert(comment);

  TestValidator.equals(
    "comment should be attached to the original post",
    comment.post.id,
    post.id,
  );

  // 6. Create a second post in the same community
  const secondPostCreate = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.paragraph({ sentences: 6 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const secondPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: secondPostCreate,
    });
  typia.assert(secondPost);

  TestValidator.predicate(
    "second post should also be unlocked by default",
    secondPost.is_locked === false,
  );

  // 7. Negative path: attempt to create a comment on secondPost with an
  // invalid parentCommentId that does not belong to that post.
  const invalidParentCommentId = typia.random<string & tags.Format<"uuid">>();

  const invalidCommentCreate = {
    content: RandomGenerator.paragraph({ sentences: 3 }),
    parentCommentId: invalidParentCommentId,
  } satisfies ICommunityPlatformComment.ICreate;

  await TestValidator.error(
    "invalid parentCommentId should be rejected",
    async () => {
      await api.functional.communityPlatform.memberUser.posts.comments.create(
        connection,
        {
          postId: secondPost.id as string & tags.Format<"uuid">,
          body: invalidCommentCreate,
        },
      );
    },
  );
}
