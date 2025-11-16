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
 * Validate member-driven post report creation for a valid community post.
 *
 * Business purpose
 *
 * - Ensure that a freshly registered member user (memberUser actor) can create a
 *   new community, post a piece of content into that community, and then file a
 *   post-level report against that post.
 * - Verify that POST /communityPlatform/memberUser/postReports wires together the
 *   correct post, reporter, and reason fields and returns a fully populated
 *   ICommunityPlatformPostReport instance.
 *
 * End-to-end steps
 *
 * 1. Register a new member user via POST /auth/memberUser/join. This both creates
 *    the member account and installs an authenticated token into the SDK
 *    connection so that subsequent memberUser endpoints run in the context of
 *    this user.
 * 2. As this authenticated member, create a new community via POST
 *    /communityPlatform/memberUser/communities using a realistic
 *    ICommunityPlatformCommunity.ICreate payload (slug, name, visibility,
 *    status, NSFW/quarantine flags, and posting configuration booleans).
 * 3. Using the same authenticated member, create a new post in that community via
 *    POST /communityPlatform/memberUser/posts with a body that conforms to
 *    ICommunityPlatformPost.ICreate (communityId, communityCode, title, and
 *    either body or url, plus an optional postType that is coherent with the
 *    payload).
 * 4. With the created post, call POST /communityPlatform/memberUser/postReports
 *    with a body that satisfies ICommunityPlatformPostReport.ICreate,
 *    including:
 *
 *    - Post_id equal to the created post.id
 *    - A symbolic reason_category string (e.g. "spam")
 *    - A severity string such as "low" or "high"
 *    - An optional reason_detail explaining the report in free text.
 * 5. Assert using typia.assert that:
 *
 *    - The join response matches ICommunityPlatformMemberuser.IAuthorized.
 *    - The community creation response matches ICommunityPlatformCommunity.
 *    - The post creation response matches ICommunityPlatformPost.
 *    - The post report creation response matches ICommunityPlatformPostReport.
 * 6. Perform focused logical validations with TestValidator:
 *
 *    - The report.post, when present, has id equal to the created post.id.
 *    - The report.reporterMember, when present, has id equal to the authorized
 *         member.id.
 *    - Report.reason_category equals the requested reason_category.
 *    - Report.severity equals the requested severity.
 *    - Report.status is a non-empty string (we do not assert an exact status value
 *         because it is controlled by backend policy).
 * 7. Optionally check timestamps:
 *
 *    - Report.created_at and report.updated_at are non-empty strings; we rely on
 *         typia.assert to guarantee their date-time format.
 */
export async function test_api_post_report_creation_by_member_for_valid_post(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new member user, which also installs
  //    the Authorization header into the connection.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(member);

  // 2. Create a community owned by this member.
  const communityCreateBody = {
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
      { body: communityCreateBody },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. Create a post in that community using both communityId and communityCode
  //    (slug) for clarity.
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 6,
    }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert<ICommunityPlatformPost>(post);

  // 4. Create a post report targeting the created post.
  const reasonCategory = "spam";
  const severity = "low";
  const reportCreateBody = {
    post_id: post.id,
    reason_category: reasonCategory,
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
    severity,
  } satisfies ICommunityPlatformPostReport.ICreate;

  const report: ICommunityPlatformPostReport =
    await api.functional.communityPlatform.memberUser.postReports.create(
      connection,
      { body: reportCreateBody },
    );
  typia.assert<ICommunityPlatformPostReport>(report);

  // 5. Logical validations on relationships and echoing of inputs.

  // 5-1. Post relation should point to the created post when present.
  if (report.post !== undefined) {
    TestValidator.equals(
      "reported post id should match created post id",
      report.post.id,
      post.id,
    );
  }

  // 5-2. Reporter member should match the joining member when present.
  if (report.reporterMember !== undefined && report.reporterMember !== null) {
    TestValidator.equals(
      "reporter member id should match joining member id",
      report.reporterMember.id,
      member.id,
    );
  }

  // 5-3. Reason category and severity should echo the request body.
  TestValidator.equals(
    "reason_category should echo request payload",
    report.reason_category,
    reasonCategory,
  );

  TestValidator.equals(
    "severity should echo request payload",
    report.severity,
    severity,
  );

  // 5-4. Status should be a non-empty string (exact value is backend-defined).
  TestValidator.predicate(
    "report status should be a non-empty string",
    report.status.length > 0,
  );

  // 5-5. created_at / updated_at existence is already type-validated by typia,
  //      but we still check that they are non-empty strings at runtime.
  TestValidator.predicate(
    "created_at should be a non-empty string",
    report.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be a non-empty string",
    report.updated_at.length > 0,
  );
}
