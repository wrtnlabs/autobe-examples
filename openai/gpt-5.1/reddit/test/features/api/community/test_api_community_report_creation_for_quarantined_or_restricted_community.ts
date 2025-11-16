import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityReport";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";

/**
 * Validate that member users can file community-level reports against
 * communities that are configured with restrictive flags such as NSFW,
 * quarantined, and posting restricted, and that those flags do not prevent
 * reporting.
 *
 * Business goal:
 *
 * - Ensure safety and moderation tooling works regardless of community visibility
 *   or posting configuration, so problematic communities can always be
 *   reported.
 *
 * Steps:
 *
 * 1. Register and authenticate a member user via /auth/memberUser/join.
 * 2. Create a new community via /communityPlatform/memberUser/communities with
 *    restrictive configuration: visibility "restricted", is_nsfw=true,
 *    is_quarantined=true, is_posting_restricted=true, while allowing all post
 *    types.
 * 3. File a community-level report via
 *    /communityPlatform/memberUser/communityReports targeting the created
 *    community, with a clear reason_category and reason_detail.
 * 4. Assert the report creation succeeds, the response type matches
 *    ICommunityPlatformCommunityReport, and the foreign key community_id equals
 *    the created community id.
 * 5. Sanity-check that the report has a non-empty id, status, and severity
 *    strings, without depending on particular enumerated values.
 */
export async function test_api_community_report_creation_for_quarantined_or_restricted_community(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member user
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create a restricted / quarantined community
  const createCommunityBody = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "restricted",
    status: "active",
    is_nsfw: true,
    is_quarantined: true,
    is_posting_restricted: true,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: createCommunityBody,
      },
    );
  typia.assert(community);

  TestValidator.equals(
    "community visibility should be restricted as configured",
    community.visibility,
    "restricted",
  );
  TestValidator.predicate(
    "community is configured as NSFW and quarantined",
    community.is_nsfw === true && community.is_quarantined === true,
  );

  // 3. File a community-level report referencing the restricted/quarantined community
  const reportBody = {
    community_id: community.id,
    reason_category: "policy_violation_spam",
    reason_detail: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformCommunityReport.ICreate;

  const report: ICommunityPlatformCommunityReport =
    await api.functional.communityPlatform.memberUser.communityReports.create(
      connection,
      {
        body: reportBody,
      },
    );
  typia.assert(report);

  // 4. Validate that the report is tied to the same community and basic fields are populated
  TestValidator.equals(
    "report should be associated with the created community",
    report.community_id,
    community.id,
  );

  TestValidator.predicate(
    "report id should be a non-empty string",
    typeof report.id === "string" && report.id.length > 0,
  );

  TestValidator.predicate(
    "report status should be a non-empty string",
    typeof report.status === "string" && report.status.length > 0,
  );

  TestValidator.predicate(
    "report severity should be a non-empty string",
    typeof report.severity === "string" && report.severity.length > 0,
  );
}
