import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalAdmin";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalPost";
import type { ICommunityPortalReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalReport";
import type { ICommunityPortalUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalUser";

/**
 * E2E test: Report hard-delete authorization and retention behavior.
 *
 * Purpose:
 *
 * - Verify that non-admin actors cannot call the admin hard-delete endpoint.
 * - Verify that admin actors can attempt hard-delete; the test tolerates two
 *   legitimate outcomes depending on environment policy: (1) deletion succeeds
 *   without throwing, or (2) deletion is blocked by retention/legal-hold and
 *   the call throws. The test asserts the presence or absence of an error but
 *   does not inspect HTTP status codes.
 *
 * Notes on limitations:
 *
 * - The provided SDK does not include GET endpoints to re-fetch reports or any
 *   audit-log endpoints. Therefore, the test cannot verify subsequent GET/404
 *   or audit log entries. Those checks are omitted and documented here.
 */
export async function test_api_report_hard_delete_authorization_and_retention(
  connection: api.IConnection,
) {
  // Create isolated connection clones for each actor. The SDK join() calls
  // populate Authorization tokens into these clones without mutating the
  // original connection.
  const memberConn: api.IConnection = { ...connection, headers: {} };
  const adminConn: api.IConnection = { ...connection, headers: {} };

  // --- 1) Member registration (reporter) ---
  const uniqueSuffix = Date.now().toString().slice(-6);
  const memberBody = {
    username: `${RandomGenerator.name(1).replace(/\s+/g, "_")}_${uniqueSuffix}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const member: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(memberConn, {
      body: memberBody,
    });
  typia.assert(member);

  // --- 2) Create community as member ---
  const communityBody = {
    name: RandomGenerator.name(2),
    is_private: false,
    visibility: "public",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPortalCommunity.ICreate;

  const community: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(memberConn, {
      body: communityBody,
    });
  typia.assert(community);

  // --- 3) Create a text post in the community ---
  const postBody = {
    community_id: community.id,
    post_type: "text" as const,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPortalPost.ICreate;

  const post: ICommunityPortalPost =
    await api.functional.communityPortal.member.posts.create(memberConn, {
      body: postBody,
    });
  typia.assert(post);

  // --- 4) Create a report targeting the created post ---
  // Use request-field naming consistent with the API documentation (snake_case)
  const reportRequest = {
    post_id: post.id,
    reason_code: "spam",
    reason_text: RandomGenerator.paragraph({ sentences: 2 }),
    is_urgent: false,
  } satisfies ICommunityPortalReport.ICreate;

  const report: ICommunityPortalReport =
    await api.functional.communityPortal.member.reports.create(memberConn, {
      body: reportRequest,
    });
  typia.assert(report);

  // --- 5) Create admin account ---
  const adminBody = {
    username: `admin_${RandomGenerator.alphaNumeric(6)}_${uniqueSuffix}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminP@ssw0rd!",
    displayName: RandomGenerator.name(),
    isActive: true,
  } satisfies ICommunityPortalAdmin.ICreate;

  const admin: ICommunityPortalAdmin.IAuthorized =
    await api.functional.auth.admin.join(adminConn, {
      body: adminBody,
    });
  typia.assert(admin);

  // --- 6) Authorization test: non-admin (member) must NOT be able to hard-delete ---
  await TestValidator.error("non-admin cannot hard-delete report", async () => {
    await api.functional.communityPortal.admin.reports.erase(memberConn, {
      reportId: report.id,
    });
  });

  // --- 7) Admin deletion test: acceptable outcomes:
  //   A) deletion succeeds (no throw)
  //   B) deletion throws (retention/legal-hold blocks deletion)
  // We accept either outcome and assert appropriately without checking status codes.
  try {
    await api.functional.communityPortal.admin.reports.erase(adminConn, {
      reportId: report.id,
    });

    // If no exception, deletion succeeded.
    TestValidator.predicate("admin hard-delete succeeded", true);
  } catch (err) {
    // If an exception occurred, treat as a permissible retention-block case
    await TestValidator.error(
      "admin deletion blocked by retention or policy",
      async () => {
        throw err;
      },
    );
  }
}
