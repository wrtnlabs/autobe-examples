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
 * Validate not-found behavior of admin community report detail endpoint.
 *
 * Business goal: Ensure that GET
 * /communityPlatform/adminUser/communityReports/{communityReportId} correctly
 * returns a not-found HTTP error (404) when the requested community report does
 * not exist, while still succeeding for an existing report id under the same
 * authenticated adminUser session.
 *
 * Scenario outline:
 *
 * 1. A memberUser joins the platform (registration + initial session).
 * 2. That memberUser creates a new community.
 * 3. The memberUser files a community-level report targeting the created
 *    community.
 * 4. An adminUser joins (which also authenticates them).
 * 5. The adminUser calls the community report detail API with a fabricated UUID
 *    that does not correspond to any existing report and expects a 404.
 * 6. The adminUser then calls the same endpoint with the real report id and
 *    expects a 200 with a valid ICommunityPlatformCommunityReport payload.
 *
 * This test ensures that:
 *
 * - The not-found behavior is specific to non-existent IDs, not due to missing
 *   authentication or misconfigured roles.
 * - The success path for valid report ids continues to function correctly after a
 *   not-found attempt in the same session.
 */
export async function test_api_admin_community_report_detail_not_found(
  connection: api.IConnection,
) {
  // 1. MemberUser joins (register + authenticated session).
  const memberJoinBody = {
    username: RandomGenerator.alphabets(8),
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

  // 2. MemberUser creates a community.
  const communityCreateBody = {
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
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 3. MemberUser files a community-level report for the newly created community.
  const reportCreateBody = {
    community_id: community.id,
    reason_category: "spam",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityReport.ICreate;

  const createdReport: ICommunityPlatformCommunityReport =
    await api.functional.communityPlatform.memberUser.communityReports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(createdReport);

  // 4. AdminUser joins (registration + authenticated admin session).
  const adminJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!", // satisfies tags.Format<"password"> contract
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 5. Build a fabricated UUID that is guaranteed not to match createdReport.id.
  let nonexistentReportId: string & tags.Format<"uuid">;
  while (true) {
    const candidate = typia.random<string & tags.Format<"uuid">>();
    if (candidate !== createdReport.id) {
      nonexistentReportId = candidate;
      break;
    }
  }

  // 6. As adminUser, calling detail endpoint with non-existent id must yield 404.
  await TestValidator.httpError(
    "admin report detail returns 404 for non-existent report id",
    404,
    async () => {
      await api.functional.communityPlatform.adminUser.communityReports.at(
        connection,
        {
          communityReportId: nonexistentReportId,
        },
      );
    },
  );

  // 7. Control case: using the real id must succeed and return the same report.
  const fetchedReport: ICommunityPlatformCommunityReport =
    await api.functional.communityPlatform.adminUser.communityReports.at(
      connection,
      {
        communityReportId: createdReport.id,
      },
    );
  typia.assert(fetchedReport);

  // Validate core identity fields equality.
  TestValidator.equals(
    "fetched report id matches created report id",
    fetchedReport.id,
    createdReport.id,
  );

  TestValidator.equals(
    "fetched report community_id matches created community id",
    fetchedReport.community_id,
    community.id,
  );
}
