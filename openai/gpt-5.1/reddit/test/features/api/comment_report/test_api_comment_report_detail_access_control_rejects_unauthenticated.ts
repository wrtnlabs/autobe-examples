import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Verify that admin-only comment report detail endpoint rejects unauthenticated
 * access.
 *
 * Business context:
 *
 * - Comment reports are moderation artifacts that should only be readable by
 *   admin users.
 * - Member users can create comments and file reports, but they must not be able
 *   to read the full moderation detail view exposed under the adminUser
 *   namespace.
 * - Anonymous callers (no Authorization header) must also be rejected.
 *
 * This test exercises a realistic flow to create a valid comment report, then
 * tries to read it through the admin-only endpoint without admin authentication
 * and verifies that an error is raised.
 *
 * Steps:
 *
 * 1. Register and authenticate a member user via POST /auth/memberUser/join.
 * 2. As that member, create a community via POST
 *    /communityPlatform/memberUser/communities.
 * 3. As that member, join the community via POST
 *    /communityPlatform/memberUser/communities/{communitySlug}/memberships.
 * 4. As that member, create a post in the community via POST
 *    /communityPlatform/memberUser/posts.
 * 5. As that member, create a comment on the post via POST
 *    /communityPlatform/memberUser/posts/{postId}/comments.
 * 6. As that member, file a comment report via POST
 *    /communityPlatform/memberUser/commentReports.
 * 7. Construct an unauthenticated connection by cloning the base connection with
 *    empty headers.
 * 8. Call GET /communityPlatform/adminUser/commentReports/{commentReportId} using
 *    the unauthenticated connection and assert that it fails using
 *    TestValidator.error.
 */
export async function test_api_comment_report_detail_access_control_rejects_unauthenticated(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member user
  const memberJoinInput = {
    username: RandomGenerator.alphabets(8) as string &
      tags.MinLength<3> &
      tags.MaxLength<32>,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string & tags.MinLength<8>,
    ip: null,
    href: "https://example.com/join" as string & tags.Format<"uri">,
    referrer: "https://example.com/landing" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinInput,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 2. Create a community as the member user
  const communityCreateBody = {
    slug: RandomGenerator.alphabets(12) as string &
      tags.MinLength<1> &
      tags.MaxLength<128>,
    name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 10,
    }) as string & tags.MinLength<1> & tags.MaxLength<255>,
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 10,
    }) as (string & tags.MaxLength<4000>) | null,
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
        body: communityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. Join the community (membership creation)
  const membershipCreateBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembership>(membership);

  // 4. Create a post in the community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 10,
    }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert<ICommunityPlatformPost>(post);

  // 5. Create a comment on the post
  const commentCreateBody = {
    content: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 10,
    }) as string & tags.MinLength<1> & tags.MaxLength<10000>,
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentCreateBody,
      },
    );
  typia.assert<ICommunityPlatformComment>(comment);

  // 6. File a comment report as the member user
  const reportCreateBody = {
    comment_id: comment.id,
    reason_category: "harassment",
    reason_detail: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 10,
    }),
  } satisfies ICommunityPlatformCommentReport.ICreate;

  const report: ICommunityPlatformCommentReport =
    await api.functional.communityPlatform.memberUser.commentReports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommentReport>(report);

  // 7. Build an unauthenticated connection by cloning and clearing headers at creation time
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 8. Attempt to access admin-only comment report detail without authentication
  await TestValidator.error(
    "unauthenticated access to admin comment report detail must fail",
    async () => {
      await api.functional.communityPlatform.adminUser.commentReports.at(
        unauthenticatedConnection,
        {
          commentReportId: report.id,
        },
      );
    },
  );
}
