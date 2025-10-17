import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalPost";
import type { ICommunityPortalReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalReport";

export async function test_api_report_create_post_by_member(
  connection: api.IConnection,
) {
  /**
   * E2E: Member reports a post (happy-path)
   *
   * Steps:
   *
   * 1. Register a new member (POST /auth/member/join)
   * 2. Create a community (POST /communityPortal/member/communities)
   * 3. Create a text post in that community (POST /communityPortal/member/posts)
   * 4. Create a report for the post (POST /communityPortal/member/reports)
   *
   * Validations:
   *
   * - Typia.assert() on every non-void response
   * - Report.reporterUserId equals created member id
   * - Report.postId equals created post id
   * - Report.reasonCode equals provided reason_code
   * - Report.status is the initial expected state ('OPEN')
   * - Report.createdAt is parseable as ISO-8601
   */

  // 1) Register a new member
  const memberBody = {
    username: `e2e-${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd123",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const member: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberBody,
    });
  typia.assert(member);

  // 2) Create a community
  const communityBody = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    slug: RandomGenerator.alphaNumeric(10).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    is_private: false,
    visibility: "public",
  } satisfies ICommunityPortalCommunity.ICreate;

  const community: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  // 3) Create a text post in the community
  const postBody = {
    community_id: community.id,
    post_type: "text",
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 3, wordMax: 8 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPortalPost.ICreate;

  const post: ICommunityPortalPost =
    await api.functional.communityPortal.member.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  // 4) Create a report for the post
  // Use snake_case keys in request per endpoint doc (server may accept these);
  // response will be validated against camelCase properties.
  const reportBody = {
    post_id: post.id,
    reason_code: "spam",
    reason_text: "Automated test report: perceived spam content.",
    is_urgent: false,
  } satisfies ICommunityPortalReport.ICreate;

  const report: ICommunityPortalReport =
    await api.functional.communityPortal.member.reports.create(connection, {
      body: reportBody,
    });
  typia.assert(report);

  // Validations (actual-first, expected-second)
  TestValidator.equals(
    "report reporterUserId equals created member id",
    report.reporterUserId,
    member.id,
  );

  TestValidator.equals("report targets created post", report.postId, post.id);

  TestValidator.equals(
    "report reason code matches",
    report.reasonCode,
    reportBody.reason_code,
  );

  // The API documentation suggests initial status like 'OPEN'. If the
  // implementation uses a different initial state, adjust this expectation.
  TestValidator.equals("report status is OPEN", report.status, "OPEN");

  TestValidator.predicate("report createdAt is parseable ISO-8601", () => {
    return (
      report.createdAt !== null && !Number.isNaN(Date.parse(report.createdAt))
    );
  });
}
