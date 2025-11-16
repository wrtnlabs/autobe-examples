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
 * Validate that a community moderator can view the community associated with a
 * specific report.
 *
 * Business goal: A community moderator, once authenticated, should be able to
 * inspect the community context for a given report using the community-targeted
 * report view endpoint. This test exercises the happy-path flow from report
 * creation (as a member user) through moderator inspection.
 *
 * High-level steps:
 *
 * 1. Register a member user (reporter) using /auth/memberUser/join so the platform
 *    has an authenticated actor that is allowed to create reports.
 * 2. As that member user, create a new report via POST
 *    /communityPlatform/memberUser/reports using
 *    ICommunityPlatformReport.ICreate. We rely on the backend's internal wiring
 *    to bind this report to a community and to create the community-targeted
 *    subtype row in community_platform_report_of_communities.
 * 3. Register a community moderator account via /auth/communityModerator/join. The
 *    SDK will switch the Authorization header to the moderator's token,
 *    simulating an authenticated moderator session.
 * 4. With the moderator session active, call GET
 *    /communityPlatform/communityModerator/reports/{reportId}/community with
 *    the id of the report created in step 2.
 * 5. Validate that the response is a well-formed
 *    ICommunityPlatformReportOfCommunities, and that its embedded community
 *    object is structurally consistent (identifier vs identifier_normalized,
 *    timestamps, and key lifecycle flags).
 *
 * Notes and limitations:
 *
 * - The test cannot explicitly create a community entity or assign moderators to
 *   specific communities, because no such endpoints are provided. Instead, we
 *   trust the backend to associate the report to an appropriate community for
 *   the purposes of this endpoint.
 * - We focus on validating the successful retrieval and structural consistency of
 *   the returned DTOs, not on complex authorization edge cases or negative
 *   paths.
 */
export async function test_api_community_moderator_view_reported_community_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register a member user who will act as the reporter.
  const memberJoinRequest = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join/member", // any valid URI
    referrer: "https://example.com/landing", // any valid URI
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinRequest,
    });
  typia.assert(memberAuthorized);

  // 2. As the member user, create a new report.
  //    We base the body on typia.random to satisfy all structural constraints
  //    and then override reporter_type to a realistic value.
  const randomReportCreate = typia.random<ICommunityPlatformReport.ICreate>();

  const reportCreateBody = {
    ...randomReportCreate,
    reporter_type: "member",
  } satisfies ICommunityPlatformReport.ICreate;

  const createdReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(createdReport);

  // 3. Register a community moderator account.
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(2),
    href: "https://example.com/join/moderator",
    referrer: "https://example.com/landing/moderator",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 4. As the moderator, fetch the reported community context for the created report.
  const reportOfCommunity: ICommunityPlatformReportOfCommunities =
    await api.functional.communityPlatform.communityModerator.reports.community.at(
      connection,
      {
        reportId: createdReport.id,
      },
    );
  typia.assert(reportOfCommunity);

  const community = reportOfCommunity.community;
  typia.assert<ICommunityPlatformCommunity>(community);

  // 5. Validate structural consistency and key business expectations.

  // 5-1. Basic identity and timestamps
  TestValidator.predicate(
    "reported community linkage has stable id",
    (community.id.length > 0 && reportOfCommunity.id.length > 0) === true,
  );

  TestValidator.predicate(
    "created_at is not after updated_at for reportOfCommunity",
    () => reportOfCommunity.created_at <= reportOfCommunity.updated_at,
  );

  TestValidator.predicate(
    "community created_at is not after updated_at",
    () => community.created_at <= community.updated_at,
  );

  // 5-2. Identifier normalization: identifier_normalized should be lowercase(identifier).
  TestValidator.equals(
    "identifier_normalized is lowercase of identifier",
    community.identifier_normalized,
    community.identifier.toLowerCase(),
  );

  // 5-3. Visibility level object has non-empty code and name.
  TestValidator.predicate(
    "community visibility level has non-empty code and name",
    () =>
      community.visibilityLevel.code.length > 0 &&
      community.visibilityLevel.name.length > 0,
  );

  // 5-4. Lifecycle flags are boolean and present.
  TestValidator.predicate(
    "community lifecycle flags are present",
    community.is_archived === true || community.is_archived === false,
  );
  TestValidator.predicate(
    "community removal flag is present",
    community.is_removed === true || community.is_removed === false,
  );
}
