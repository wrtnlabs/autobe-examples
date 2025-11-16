import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Verify that creating a comment report requires an authenticated member user.
 *
 * Business goal:
 *
 * - Ensure the comment report creation endpoint rejects unauthenticated callers
 *   while accepting properly authenticated member users.
 *
 * Scenario steps:
 *
 * 1. Join as a new memberUser via /auth/memberUser/join to obtain an authenticated
 *    session bound to the provided connection.
 * 2. With this authenticated memberUser, create a community via
 *    /communityPlatform/memberUser/communities and capture its slug.
 * 3. Create a community membership for the member user via
 *    /communityPlatform/memberUser/communities/{communitySlug}/memberships.
 * 4. Create a post in that community using /communityPlatform/memberUser/posts.
 * 5. Create a comment on that post via
 *    /communityPlatform/memberUser/posts/{postId}/comments and capture the
 *    comment id.
 * 6. Build a comment report request body using the captured comment id and a valid
 *    reason_category, satisfying ICommunityPlatformCommentReport.ICreate.
 * 7. Construct an unauthenticated connection instance by shallow-cloning the
 *    original connection and replacing headers with an empty object.
 * 8. Using this unauthenticated connection, attempt to call
 *    /communityPlatform/memberUser/commentReports and expect an error using
 *    TestValidator.error (without validating specific HTTP status codes).
 * 9. Then, using the original authenticated connection, call the same comment
 *    report creation endpoint with the same request body and expect success.
 *    Validate the response type with typia.assert and business fields via
 *    TestValidator.equals (e.g., ensure the response.comment.id matches the
 *    original comment id and the response.reason_category matches the input).
 *
 * Constraints and rules:
 *
 * - Do not add or modify imports beyond those provided in the template.
 * - Do not manipulate connection.headers directly other than creating a cloned
 *   unauthenticated connection object with headers: {}.
 * - Do not assert on concrete HTTP status codes; only validate that an error is
 *   thrown for unauthenticated calls using TestValidator.error.
 * - Do not write any tests that intentionally violate TypeScript types or rely on
 *   type errors.
 */
export async function test_api_comment_report_creation_requires_authenticated_member(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member user (join)
  const joinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorizedMember: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedMember);

  // 2. Create a community as this authenticated member
  const communityBody = {
    slug: RandomGenerator.alphabets(12),
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
      {
        body: communityBody,
      },
    );
  typia.assert(community);

  // 3. Create a membership in that community
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

  // 4. Create a post inside that community
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

  // 5. Create a comment on the post
  const commentBody = {
    content: RandomGenerator.paragraph({ sentences: 2 }),
    parentCommentId: undefined,
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

  // 6. Build a comment report body referencing this comment
  const reportBody = {
    comment_id: comment.id,
    reason_category: "spam",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommentReport.ICreate;

  // 7. Prepare unauthenticated connection by shallow cloning and resetting headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 8. Attempt report creation with unauthenticated connection and expect an error
  await TestValidator.error(
    "unauthenticated comment report creation must fail",
    async () => {
      await api.functional.communityPlatform.memberUser.commentReports.create(
        unauthenticatedConnection,
        {
          body: reportBody,
        },
      );
    },
  );

  // 9. Attempt report creation with authenticated connection and expect success
  const report: ICommunityPlatformCommentReport =
    await api.functional.communityPlatform.memberUser.commentReports.create(
      connection,
      {
        body: reportBody,
      },
    );
  typia.assert(report);

  // Business assertions: verify comment linkage and reason category
  TestValidator.equals(
    "created report should reference the target comment id",
    report.comment.id,
    comment.id,
  );

  TestValidator.equals(
    "created report should keep the same reason_category",
    report.reason_category,
    reportBody.reason_category,
  );
}
