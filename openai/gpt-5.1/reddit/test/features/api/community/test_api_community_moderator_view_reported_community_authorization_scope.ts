import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportOfCommunities } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfCommunities";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

/**
 * Validate authorization scope for viewing reported community details.
 *
 * This test ensures that:
 *
 * - Anonymous callers cannot access the moderator-only endpoint GET
 *   /communityPlatform/communityModerator/reports/{reportId}/community.
 * - Authenticated memberUser actors also cannot access this endpoint.
 * - Authenticated communityModerator actors can successfully view the reported
 *   community linkage for a given report.
 *
 * High-level flow:
 *
 * 1. Register a memberUser (join) so that we have an authenticated member session
 *    on the shared connection.
 * 2. As that memberUser, create a generic report via POST
 *    /communityPlatform/memberUser/reports to obtain a reportId.
 * 3. Using an unauthenticated connection (no Authorization header), attempt to
 *    call the moderator endpoint and assert that it fails.
 * 4. Using the memberUser-authenticated connection, call the moderator endpoint
 *    again and assert that it fails (moderator-only scope).
 * 5. Register a communityModerator via /auth/communityModerator/join, which
 *    overwrites the Authorization header to a moderator token.
 * 6. Using the moderator-authenticated connection, call the endpoint and assert
 *    that it succeeds and returns ICommunityPlatformReportOfCommunities with a
 *    populated community.
 */
export async function test_api_community_moderator_view_reported_community_authorization_scope(
  connection: api.IConnection,
) {
  // 1. Register a memberUser (self-service join)
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: memberEmail,
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 2. Create a report as the authenticated memberUser
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: "low",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const createdReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert<ICommunityPlatformReport>(createdReport);

  // 3. Anonymous call: clone connection without headers and assert error
  const unauthConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "anonymous user cannot view reported community",
    async () => {
      await api.functional.communityPlatform.communityModerator.reports.community.at(
        unauthConn,
        {
          reportId: createdReport.id,
        },
      );
    },
  );

  // 4. memberUser-authenticated call should also fail (moderator-only)
  await TestValidator.error(
    "memberUser cannot view reported community via moderator endpoint",
    async () => {
      await api.functional.communityPlatform.communityModerator.reports.community.at(
        connection,
        {
          reportId: createdReport.id,
        },
      );
    },
  );

  // 5. Register a communityModerator (join) to obtain moderator token
  const moderatorEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: moderatorEmail,
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(2),
    ip: null,
    href: "https://example.com/moderator/join",
    referrer: "https://example.com/moderator/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    moderatorAuthorized,
  );

  // 6. As communityModerator, successfully view the reported community linkage
  const reportedCommunity: ICommunityPlatformReportOfCommunities =
    await api.functional.communityPlatform.communityModerator.reports.community.at(
      connection,
      {
        reportId: createdReport.id,
      },
    );
  typia.assert<ICommunityPlatformReportOfCommunities>(reportedCommunity);

  // Basic business validations on the returned community
  const community: ICommunityPlatformCommunity = reportedCommunity.community;
  typia.assert<ICommunityPlatformCommunity>(community);

  TestValidator.predicate(
    "reported community identifier should be non-empty",
    community.identifier.length > 0,
  );

  TestValidator.predicate(
    "reported community title should be non-empty",
    community.title.length > 0,
  );
}
