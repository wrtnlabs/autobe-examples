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
 * Validate that comment reporting respects community membership rules.
 *
 * Business goal:
 *
 * - Only member users who are members of a given community should be able to
 *   report comments that belong to content in that community.
 * - Non-members must be rejected when attempting to report such comments.
 *
 * Scenario steps:
 *
 * 1. Register and authenticate User A (memberUser join) to obtain an authorized
 *    session.
 * 2. As User A, create a community using the memberUser community creation API.
 * 3. As User A, join that community so A becomes a community member.
 * 4. As User A, create a text post in the community.
 * 5. As User A, create a comment on that post.
 * 6. Register and authenticate User B (another memberUser) but DO NOT join the
 *    community yet.
 * 7. As User B (non-member), attempt to create a comment report targeting the
 *    comment created by User A, and assert that the attempt fails.
 * 8. As User B, join the same community so that B becomes a community member.
 * 9. As User B (now a member), create a comment report for the same comment and
 *    assert that it succeeds, verifying that the report links to the correct
 *    comment and uses B as reporter.
 */
export async function test_api_comment_report_respects_community_membership_rules(
  connection: api.IConnection,
) {
  // 1. Register and authenticate User A
  const userAJoinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://client.example.com/signup",
    referrer: "https://client.example.com/",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const userA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: userAJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(userA);

  // 2. As User A, create a community
  const communityCreateBody = {
    slug: `community_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. As User A, join that community
  const membershipABody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membershipA: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipABody,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembership>(membershipA);

  // 4. As User A, create a text post in the community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert<ICommunityPlatformPost>(post);

  // 5. As User A, create a comment on the post
  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 2 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id as string & tags.Format<"uuid">,
        body: commentCreateBody,
      },
    );
  typia.assert<ICommunityPlatformComment>(comment);

  // 6. Register and authenticate User B (connection now represents User B)
  const userBJoinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://client.example.com/signup",
    referrer: "https://client.example.com/",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const userB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: userBJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(userB);

  // 7. As User B (not a community member yet), attempt to report the comment
  const nonMemberReportBody = {
    comment_id: comment.id,
    reason_category: "harassment",
    reason_detail: null,
  } satisfies ICommunityPlatformCommentReport.ICreate;

  await TestValidator.error(
    "non-member cannot report comment in community",
    async () => {
      await api.functional.communityPlatform.memberUser.commentReports.create(
        connection,
        {
          body: nonMemberReportBody,
        },
      );
    },
  );

  // 8. As User B, join the same community
  const membershipBBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membershipB: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipBBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembership>(membershipB);

  // 9. As User B (community member), successfully create a comment report
  const memberReportBody = {
    comment_id: comment.id,
    reason_category: "harassment",
    reason_detail: "Repeated personal attacks in this thread.",
  } satisfies ICommunityPlatformCommentReport.ICreate;

  const report: ICommunityPlatformCommentReport =
    await api.functional.communityPlatform.memberUser.commentReports.create(
      connection,
      {
        body: memberReportBody,
      },
    );
  typia.assert<ICommunityPlatformCommentReport>(report);

  // Business validations on successful report
  TestValidator.equals(
    "report should target the original comment",
    report.comment.id,
    comment.id,
  );

  if (report.reporterMember != null) {
    TestValidator.equals(
      "reporter member id should match User B",
      report.reporterMember.id,
      userB.id,
    );
  } else {
    throw new Error(
      "Expected reporterMember to be populated for memberUser report",
    );
  }
}
