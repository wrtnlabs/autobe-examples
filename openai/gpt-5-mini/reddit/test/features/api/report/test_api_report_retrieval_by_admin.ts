import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsComment";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsPostMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostMedia";
import type { ICommunityBbsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsReport";
import type { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";

export async function test_api_report_retrieval_by_admin(
  connection: api.IConnection,
) {
  /**
   * Production-ready E2E test adapted to available SDK operations.
   *
   * Purpose:
   *
   * - Validate report creation behavior and privacy boundaries using only the
   *   available SDK endpoints.
   * - Ensure anonymous reports do not expose reporter identity and that
   *   authenticated reports are attributed to the authenticated member.
   *
   * Notes:
   *
   * - GET /communityBbs/communityMember/reports/:reportId is not available in the
   *   provided SDK. The test uses POST responses for validation and documents
   *   that retrieval/attachment checks are omitted for that reason.
   */

  const memberConn: api.IConnection = { ...connection, headers: {} };
  const adminConn: api.IConnection = { ...connection, headers: {} };
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 1) Create community member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(8);
  const memberAuth = await api.functional.auth.communityMember.join(
    memberConn,
    {
      body: {
        email: memberEmail,
        username: memberUsername,
        password: "Passw0rd!",
        session_context: {
          href: "http://localhost/",
          referrer: "http://localhost/",
        },
      } satisfies ICommunityBbsCommunityMember.ICreate,
    },
  );
  typia.assert(memberAuth);
  const memberId: string = memberAuth.member.id;

  // 2) Create community as member
  const communitySlug = `test-community-${Date.now()}`;
  const community =
    await api.functional.communityBbs.communityMember.communities.create(
      memberConn,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: communitySlug,
          description: RandomGenerator.paragraph({ sentences: 6 }),
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3) Create a post in the community as the member
  const post =
    await api.functional.communityBbs.communityMember.communities.posts.create(
      memberConn,
      {
        communitySlug: community.slug,
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          body: RandomGenerator.content({ paragraphs: 1 }),
          post_type: "text",
        } satisfies ICommunityBbsPost.ICreate,
      },
    );
  typia.assert(post);

  // 4) Create anonymous report against the post
  const anonReport = await api.functional.communityBbs.reports.create(
    unauthConn,
    {
      body: {
        target_type: "post",
        target_id: post.id,
        reason_code: "spam",
        explanation: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityBbsReport.ICreate,
    },
  );
  typia.assert(anonReport);

  // Validate anonymous report: required fields and privacy
  TestValidator.equals(
    "anonymous report target type is post",
    anonReport.target_type,
    "post",
  );
  TestValidator.equals(
    "anonymous report target id matches post id",
    anonReport.target_id,
    post.id,
  );
  TestValidator.equals(
    "anonymous report reason code is spam",
    anonReport.reason_code,
    "spam",
  );
  TestValidator.equals(
    "anonymous report reporter_id is null",
    anonReport.reporter_id,
    null,
  );
  TestValidator.predicate(
    "anonymous report evidence_count is non-negative",
    anonReport.evidence_count >= 0,
  );
  TestValidator.predicate(
    "anonymous report has created_at timestamp",
    typeof anonReport.created_at === "string",
  );

  // 5) Create a system admin actor (kept for multi-actor coverage)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminAuth = await api.functional.auth.systemAdmin.join(adminConn, {
    body: {
      email: adminEmail,
      password: "Passw0rd!",
      display_name: RandomGenerator.name(2),
    } satisfies ICommunityBbsSystemAdmin.ICreate,
  });
  typia.assert(adminAuth);

  // 6) Create an authenticated report (by the member)
  const authReport = await api.functional.communityBbs.reports.create(
    memberConn,
    {
      body: {
        target_type: "post",
        target_id: post.id,
        reason_code: "harassment",
        explanation: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies ICommunityBbsReport.ICreate,
    },
  );
  typia.assert(authReport);

  // Validate authenticated report attribution and fields
  TestValidator.predicate(
    "authenticated report includes reporter id",
    authReport.reporter_id !== null && authReport.reporter_id !== undefined,
  );
  TestValidator.equals(
    "authenticated report reporter id matches member",
    authReport.reporter_id,
    memberId,
  );
  TestValidator.equals(
    "authenticated report target type is post",
    authReport.target_type,
    "post",
  );
  TestValidator.equals(
    "authenticated report target id matches post id",
    authReport.target_id,
    post.id,
  );
  TestValidator.equals(
    "authenticated report reason code is harassment",
    authReport.reason_code,
    "harassment",
  );
  TestValidator.predicate(
    "authenticated report has created_at timestamp",
    typeof authReport.created_at === "string",
  );

  // Note: GET retrieval and includeAttachments behavior are not tested because
  // the SDK does not provide a GET report endpoint. This test ensures the
  // critical privacy and triage fields are present and correct on create
  // responses, satisfying the primary business intent within available API surface.
}
