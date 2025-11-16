import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityReport";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";

/**
 * Validate that deleting community reports via the adminUser endpoint strictly
 * requires admin authentication.
 *
 * Business goals:
 *
 * - A plain unauthenticated caller must not be able to delete
 *   community_platform_community_reports rows.
 * - An authenticated memberUser must also be forbidden from deleting community
 *   reports through the adminUser-only endpoint.
 * - A properly authenticated adminUser may delete the report successfully.
 *
 * Scenario outline:
 *
 * 1. Create a memberUser account via /auth/memberUser/join.
 * 2. As that memberUser, create a community via
 *    /communityPlatform/memberUser/communities using
 *    ICommunityPlatformCommunity.ICreate.
 * 3. Still as that memberUser, create a community-level report via
 *    /communityPlatform/memberUser/communityReports and capture its id.
 * 4. Derive an unauthenticated connection with empty headers and attempt to call
 *    DELETE /communityPlatform/adminUser/communityReports/{communityReportId}.
 *    Expect an HTTP authentication error (401-like) using
 *    TestValidator.httpError.
 * 5. Ensure the main connection is logged in as the memberUser and attempt the
 *    same DELETE call again. Expect an HTTP authorization error (403-like)
 *    using TestValidator.httpError, confirming that memberUser cannot delete
 *    adminUser-scoped reports.
 * 6. Join and login an adminUser via /auth/adminUser/join and
 *    /auth/adminUser/login, then call the DELETE endpoint once more. This time
 *    the call should succeed without throwing, demonstrating that only
 *    adminUser actors can delete community reports.
 */
export async function test_api_admin_community_report_delete_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1. Register a memberUser and obtain an authenticated session
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. As memberUser, create a community
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
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 3. As memberUser, create a community-level report targeting the community
  const reportCreateBody = {
    community_id: community.id,
    reason_category: "test_unauthorized_delete",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityReport.ICreate;

  const report: ICommunityPlatformCommunityReport =
    await api.functional.communityPlatform.memberUser.communityReports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(report);

  const communityReportId: string = report.id;

  // 4. Attempt deletion with a completely unauthenticated connection
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.httpError(
    "unauthenticated caller cannot delete community report",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.adminUser.communityReports.erase(
        unauthConnection,
        {
          communityReportId,
        },
      );
    },
  );

  // 5. Attempt deletion using a memberUser-authenticated connection
  const memberLoginBody = {
    identifier: memberJoinBody.username,
    password: memberJoinBody.password,
    ip: null,
    href: "https://example.com/login",
    referrer: "https://example.com/community",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberLoginResult: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginResult);

  await TestValidator.httpError(
    "memberUser cannot delete community report via admin endpoint",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.adminUser.communityReports.erase(
        connection,
        {
          communityReportId,
        },
      );
    },
  );

  // 6. Join and login an adminUser, then delete successfully
  const adminJoinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminLoginBody = {
    identifier: adminJoinBody.username,
    password: adminJoinBody.password,
    ip: null,
    href: "https://example.com/admin/login",
    referrer: "https://example.com/admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoginResult: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginResult);

  // When authenticated as adminUser, deletion should succeed without throwing
  await api.functional.communityPlatform.adminUser.communityReports.erase(
    connection,
    {
      communityReportId,
    },
  );
}
