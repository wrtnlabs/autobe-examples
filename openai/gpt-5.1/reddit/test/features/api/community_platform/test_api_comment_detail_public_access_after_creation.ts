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
 * Validate public access to comment detail after creation in a public community
 * and post.
 *
 * Business goal: Ensure that when a member user creates a comment in a public
 * community and post, the comment detail can be retrieved through the public
 * comment detail endpoint without authentication, and that the returned payload
 * exposes correct, non-sensitive author and post information.
 *
 * Scenario steps:
 *
 * 1. Register a new member user via auth.memberUser.join.
 * 2. Create a public, active community using the member context.
 * 3. Create a membership for the member user in that community.
 * 4. Create a new post in that community.
 * 5. Create a new top-level comment for that post.
 * 6. Clone the connection into an unauthenticated connection (no Authorization
 *    header).
 * 7. Call the public comment detail endpoint with postId and commentId.
 * 8. Assert that the response is a valid ICommunityPlatformComment and that key
 *    business associations and fields match the created entities.
 * 9. Additionally, verify that postId/commentId association is enforced by
 *    requesting the comment under a different postId and expecting an error.
 */
export async function test_api_comment_detail_public_access_after_creation(
  connection: api.IConnection,
) {
  // 1. Register a new member user to obtain an authenticated memberUser context.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create a public, active community.
  const communityBody = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: false,
    allow_image_posts: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert(community);

  // 3. Create a membership for the member user in that community.
  const membershipBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipBody,
      },
    );
  typia.assert(membership);

  // 4. Create a new post in that community.
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  // 5. Create a new top-level comment for that post.
  const commentContent: string = RandomGenerator.paragraph({ sentences: 4 });
  const commentBody = {
    content: commentContent,
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const createdComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentBody,
      },
    );
  typia.assert(createdComment);

  // Sanity checks on creation associations.
  TestValidator.equals(
    "created comment post association matches post",
    createdComment.post.id,
    post.id,
  );
  TestValidator.equals(
    "created comment author association matches member",
    createdComment.author.id,
    member.id,
  );
  TestValidator.equals(
    "created comment body matches input content",
    createdComment.body,
    commentContent,
  );

  // 6. Clone into an unauthenticated connection (no Authorization header).
  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 7. Call the public comment detail endpoint without authentication.
  const publicComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.posts.comments.at(publicConnection, {
      postId: createdComment.post.id,
      commentId: createdComment.id,
    });
  typia.assert(publicComment);

  // 8. Validate core fields and associations.
  TestValidator.equals(
    "public comment id matches created comment id",
    publicComment.id,
    createdComment.id,
  );
  TestValidator.equals(
    "public comment body matches original content",
    publicComment.body,
    commentContent,
  );
  TestValidator.equals(
    "public comment post association matches original post",
    publicComment.post.id,
    post.id,
  );
  TestValidator.equals(
    "public comment author association matches original member",
    publicComment.author.id,
    member.id,
  );

  await TestValidator.predicate(
    "public comment created_at is non-empty",
    () =>
      typeof publicComment.created_at === "string" &&
      publicComment.created_at.length > 0,
  );

  await TestValidator.predicate(
    "public comment updated_at is non-empty",
    () =>
      typeof publicComment.updated_at === "string" &&
      publicComment.updated_at.length > 0,
  );

  // 9. Validate that postId/commentId association is enforced by requesting
  // with a mismatched postId and expecting an error.
  const mismatchedPostId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "comment cannot be retrieved under mismatched postId",
    async () => {
      await api.functional.communityPlatform.posts.comments.at(
        publicConnection,
        {
          postId: mismatchedPostId,
          commentId: createdComment.id,
        },
      );
    },
  );
}
