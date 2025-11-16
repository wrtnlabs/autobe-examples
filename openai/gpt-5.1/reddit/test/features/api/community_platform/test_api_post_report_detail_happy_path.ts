import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";

/**
 * Happy-path adminUser retrieval of a post report detail.
 *
 * Business goal: Verify that when a memberUser reports a post and an adminUser
 * later fetches that report via GET
 * /communityPlatform/adminUser/postReports/{postReportId}, the system returns a
 * fully populated ICommunityPlatformPostReport that is correctly linked to the
 * original post and community, correctly attributes the reporting member, and
 * echoes key moderation attributes.
 *
 * Steps:
 *
 * 1. Register and log in a memberUser.
 * 2. As that memberUser, create a community.
 * 3. Create a post inside that community.
 * 4. Submit a post report for that post as the memberUser.
 * 5. Register and log in an adminUser.
 * 6. As the adminUser, fetch the report detail by id.
 * 7. Validate identity, linkage, and moderation attributes.
 */
export async function test_api_post_report_detail_happy_path(
  connection: api.IConnection,
) {
  // 1. Register a memberUser (join implicitly authenticates and sets token)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(10),
    ip: null,
    href: "https://client.example.com/join",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create a community as the authenticated memberUser
  const communityCreateBody = {
    slug: RandomGenerator.alphabets(12),
    // Keep name within reasonable length for MaxLength<255> by using a short paragraph
    name: RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 8 }),
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
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 3. Create a post inside the community as the same memberUser
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 12,
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
  typia.assert(post);

  // 4. Submit a post report for that post as the memberUser
  const reportCreateBody = {
    post_id: post.id,
    reason_category: "spam",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
    severity: "medium",
  } satisfies ICommunityPlatformPostReport.ICreate;

  const createdReport: ICommunityPlatformPostReport =
    await api.functional.communityPlatform.memberUser.postReports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(createdReport);

  // 5. Register an adminUser (join returns authorized admin context)
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    // Use a reasonably strong-looking password string; actual Format<"password"> is validated server-side
    password: "AdminPassw0rd!",
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 6. Log in as the same adminUser explicitly (to exercise login flow)
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoggedIn: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 7. As adminUser, fetch the report detail by id
  const fetchedReport: ICommunityPlatformPostReport =
    await api.functional.communityPlatform.adminUser.postReports.at(
      connection,
      {
        postReportId: createdReport.id,
      },
    );
  typia.assert(fetchedReport);

  // 8. Business-level validations

  // 8.1 id matches path parameter / created id
  TestValidator.equals(
    "report id in detail matches created report id",
    fetchedReport.id,
    createdReport.id,
  );

  // 8.2 post relation exists and is linked to the correct post and community
  TestValidator.predicate(
    "fetched report has a post summary",
    fetchedReport.post !== undefined,
  );
  if (fetchedReport.post !== undefined) {
    TestValidator.equals(
      "post summary id matches original post id",
      fetchedReport.post.id,
      post.id,
    );
    TestValidator.equals(
      "post summary community id matches original community id",
      fetchedReport.post.community.id,
      community.id,
    );
    TestValidator.equals(
      "post summary title matches original post title",
      fetchedReport.post.title,
      post.title,
    );
  }

  // 8.3 reporter attribution: member reporter present, admin reporter absent
  TestValidator.predicate(
    "reporterMember is populated for member-submitted report",
    fetchedReport.reporterMember !== null &&
      fetchedReport.reporterMember !== undefined,
  );
  if (
    fetchedReport.reporterMember !== null &&
    fetchedReport.reporterMember !== undefined
  ) {
    TestValidator.equals(
      "reporterMember.id matches memberUser id",
      fetchedReport.reporterMember.id,
      memberAuthorized.id,
    );
  }

  TestValidator.predicate(
    "reporterAdmin is null/undefined for member-submitted report",
    fetchedReport.reporterAdmin === null ||
      fetchedReport.reporterAdmin === undefined,
  );

  // 8.4 moderation attributes echo creation input
  TestValidator.equals(
    "reason_category matches creation",
    fetchedReport.reason_category,
    reportCreateBody.reason_category,
  );
  TestValidator.equals(
    "severity matches creation",
    fetchedReport.severity,
    reportCreateBody.severity,
  );
  TestValidator.equals(
    "reason_detail matches creation (nullable string)",
    fetchedReport.reason_detail ?? null,
    reportCreateBody.reason_detail ?? null,
  );

  // 8.5 status is non-empty string (we do not assume concrete values)
  TestValidator.predicate(
    "status is a non-empty string",
    typeof fetchedReport.status === "string" &&
      fetchedReport.status.trim().length > 0,
  );

  // 8.6 moderationCase and assignedAdmin should be untouched (null/undefined)
  TestValidator.predicate(
    "moderationCase is null/undefined in fresh report",
    fetchedReport.moderationCase === null ||
      fetchedReport.moderationCase === undefined,
  );
  TestValidator.predicate(
    "assignedAdmin is null/undefined in fresh report",
    fetchedReport.assignedAdmin === null ||
      fetchedReport.assignedAdmin === undefined,
  );

  // 8.7 Temporal consistency: updated_at should not be earlier than created_at
  const createdAt = new Date(fetchedReport.created_at).getTime();
  const updatedAt = new Date(fetchedReport.updated_at).getTime();

  TestValidator.predicate(
    "updated_at is not earlier than created_at",
    !Number.isNaN(createdAt) &&
      !Number.isNaN(updatedAt) &&
      updatedAt >= createdAt,
  );
}
