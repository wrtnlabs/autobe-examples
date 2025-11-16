import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";

/**
 * Validate creation of post reports with and without optional reason_detail.
 *
 * Business goal: Ensure that when a member user reports a post, the optional
 * free-text reason_detail field is persisted exactly when provided, and that
 * the report can also be created successfully when reason_detail is omitted,
 * resulting in a null/undefined reason_detail in the stored report.
 *
 * End-to-end flow:
 *
 * 1. Join as a new community platform member user.
 * 2. As that member, create a community.
 * 3. Create a post inside the community.
 * 4. Create a post report including a non-empty reason_detail and verify that the
 *    response echoes it and links back to the correct post and reporting
 *    member.
 * 5. Create another post report for the same post omitting reason_detail, and
 *    verify that the API still accepts it and the stored report has a
 *    null/undefined reason_detail.
 * 6. Finally, verify that the two reports differ in id and in reason_detail (one
 *    populated, one null/undefined).
 */
export async function test_api_post_report_creation_captures_optional_reason_detail(
  connection: api.IConnection,
) {
  // 1. Register a new member user and obtain an authenticated session.
  const joinBody = {
    username: RandomGenerator.alphabets(8),
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

  // 2. Create a new community as this member.
  const communityBody = {
    slug: RandomGenerator.alphabets(10),
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

  // 3. Create a post in the community.
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  // 4. Create first post report with non-empty reason_detail.
  const reasonDetail1: string = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 3,
    wordMax: 8,
  });

  const reportBodyWithDetail = {
    post_id: post.id,
    reason_category: "harassment",
    reason_detail: reasonDetail1,
    severity: "high",
  } satisfies ICommunityPlatformPostReport.ICreate;

  const reportWithDetail: ICommunityPlatformPostReport =
    await api.functional.communityPlatform.memberUser.postReports.create(
      connection,
      {
        body: reportBodyWithDetail,
      },
    );
  typia.assert(reportWithDetail);

  // Validate that reason_detail and relations are correct.
  TestValidator.equals(
    "report with detail maintains reason_detail",
    reportWithDetail.reason_detail,
    reasonDetail1,
  );

  if (reportWithDetail.post !== undefined && reportWithDetail.post !== null) {
    TestValidator.equals(
      "reported post id matches original post",
      reportWithDetail.post.id,
      post.id,
    );
  } else {
    throw new Error("Expected reportWithDetail.post to be populated");
  }

  if (
    reportWithDetail.reporterMember !== undefined &&
    reportWithDetail.reporterMember !== null
  ) {
    TestValidator.equals(
      "report with detail uses joined member as reporter",
      reportWithDetail.reporterMember.id,
      member.id,
    );
  } else {
    throw new Error(
      "Expected reporterMember to be populated for member report",
    );
  }

  TestValidator.equals(
    "report with detail severity echoes request",
    reportWithDetail.severity,
    reportBodyWithDetail.severity,
  );

  TestValidator.predicate(
    "report with detail has non-empty status",
    typeof reportWithDetail.status === "string" &&
      reportWithDetail.status.length > 0,
  );
  TestValidator.predicate(
    "report with detail has created_at timestamp",
    typeof reportWithDetail.created_at === "string" &&
      reportWithDetail.created_at.length > 0,
  );
  TestValidator.predicate(
    "report with detail has updated_at timestamp",
    typeof reportWithDetail.updated_at === "string" &&
      reportWithDetail.updated_at.length > 0,
  );

  // 5. Create second post report for same post, omitting reason_detail.
  const reportBodyWithoutDetail = {
    post_id: post.id,
    reason_category: "spam",
    severity: "low",
  } satisfies ICommunityPlatformPostReport.ICreate;

  const reportWithoutDetail: ICommunityPlatformPostReport =
    await api.functional.communityPlatform.memberUser.postReports.create(
      connection,
      {
        body: reportBodyWithoutDetail,
      },
    );
  typia.assert(reportWithoutDetail);

  // Validate that reason_detail is absent or null.
  TestValidator.predicate(
    "report without detail has null/undefined reason_detail",
    reportWithoutDetail.reason_detail === null ||
      reportWithoutDetail.reason_detail === undefined,
  );

  if (
    reportWithoutDetail.post !== undefined &&
    reportWithoutDetail.post !== null
  ) {
    TestValidator.equals(
      "report without detail post id matches original post",
      reportWithoutDetail.post.id,
      post.id,
    );
  } else {
    throw new Error("Expected reportWithoutDetail.post to be populated");
  }

  if (
    reportWithoutDetail.reporterMember !== undefined &&
    reportWithoutDetail.reporterMember !== null
  ) {
    TestValidator.equals(
      "report without detail uses joined member as reporter",
      reportWithoutDetail.reporterMember.id,
      member.id,
    );
  } else {
    throw new Error(
      "Expected reporterMember to be populated for second member report",
    );
  }

  TestValidator.equals(
    "report without detail severity echoes request",
    reportWithoutDetail.severity,
    reportBodyWithoutDetail.severity,
  );

  TestValidator.predicate(
    "report without detail has non-empty status",
    typeof reportWithoutDetail.status === "string" &&
      reportWithoutDetail.status.length > 0,
  );
  TestValidator.predicate(
    "report without detail has created_at timestamp",
    typeof reportWithoutDetail.created_at === "string" &&
      reportWithoutDetail.created_at.length > 0,
  );
  TestValidator.predicate(
    "report without detail has updated_at timestamp",
    typeof reportWithoutDetail.updated_at === "string" &&
      reportWithoutDetail.updated_at.length > 0,
  );

  // 6. Cross-validate the two reports.
  TestValidator.notEquals(
    "two reports must have different ids",
    reportWithDetail.id,
    reportWithoutDetail.id,
  );

  TestValidator.predicate(
    "first report has non-empty reason_detail while second does not",
    typeof reportWithDetail.reason_detail === "string" &&
      reportWithDetail.reason_detail.length > 0 &&
      (reportWithoutDetail.reason_detail === null ||
        reportWithoutDetail.reason_detail === undefined),
  );
}
