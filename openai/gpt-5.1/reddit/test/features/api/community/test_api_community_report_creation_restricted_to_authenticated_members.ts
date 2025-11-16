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
 * Validate that community-level report creation is restricted to authenticated
 * member users.
 *
 * Business goal:
 *
 * - Ensure that POST /communityPlatform/memberUser/communityReports cannot be
 *   used by unauthenticated callers.
 * - Confirm that once a caller is authenticated as a member user and has a valid
 *   community, the same report creation flow succeeds.
 *
 * High-level flow:
 *
 * 1. Prepare an unauthenticated connection cloned from the provided connection but
 *    with a clean headers object to guarantee no auth tokens.
 * 2. Use a dummy UUID and a simple reason_category to build an
 *    ICommunityPlatformCommunityReport.ICreate payload.
 * 3. Call api.functional.communityPlatform.memberUser.communityReports.create with
 *    the unauthenticated connection and assert, via TestValidator.error, that
 *    it fails.
 * 4. Register and authenticate a member user through
 *    api.functional.auth.memberUser.join using a valid
 *    ICommunityPlatformMemberuser.IJoin body.
 * 5. With the authenticated connection, create a community through
 *    api.functional.communityPlatform.memberUser.communities.create using a
 *    valid ICommunityPlatformCommunity.ICreate body.
 * 6. Build a new ICommunityPlatformCommunityReport.ICreate payload referencing the
 *    created community’s id and call communityReports.create again.
 * 7. Assert that the report creation now succeeds, validate the response with
 *    typia.assert, and check basic business invariants like matching
 *    community_id and presence of member reporter linkage.
 */
export async function test_api_community_report_creation_restricted_to_authenticated_members(
  connection: api.IConnection,
) {
  // 1. Prepare an unauthenticated connection by shallow-cloning the base connection
  //    and assigning a fresh, empty headers object. Do not reuse or mutate the
  //    original connection.headers to avoid interfering with other tests.
  const unauthenticated: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 2. Prepare a syntactically valid report payload using a random UUID for
  //    community_id and a simple reason_category string.
  const unauthReportBody = {
    community_id: typia.random<string & tags.Format<"uuid">>(),
    reason_category: "test_unauthenticated",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityReport.ICreate;

  // 3. Attempt to create a community report without authentication and assert
  //    that it fails. We do not check specific status codes, only that an
  //    error is thrown.
  await TestValidator.error(
    "unauthenticated community report creation must fail",
    async () => {
      await api.functional.communityPlatform.memberUser.communityReports.create(
        unauthenticated,
        {
          body: unauthReportBody,
        },
      );
    },
  );

  // 4. Register and authenticate a member user via join. This call automatically
  //    attaches the memberUser access token to the provided connection.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorizedMember: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedMember);

  // 5. Create a community owned by the authenticated member user.
  const communityCreateBody = {
    slug: RandomGenerator.alphaNumeric(16),
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

  // Verify that the created community is structurally valid and linked to some
  // owning member (business logic is responsible for ownership details).
  TestValidator.equals(
    "created community slug must match request",
    community.slug,
    communityCreateBody.slug,
  );

  // 6. Create a community report as the authenticated member user, now
  //    referencing the real community_id.
  const authReportBody = {
    community_id: community.id,
    reason_category: "test_authenticated",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityReport.ICreate;

  const report: ICommunityPlatformCommunityReport =
    await api.functional.communityPlatform.memberUser.communityReports.create(
      connection,
      {
        body: authReportBody,
      },
    );
  typia.assert(report);

  // 7. Validate business invariants for the authenticated report creation.
  TestValidator.equals(
    "report community_id should match created community",
    report.community_id,
    community.id,
  );

  // Reporter should be a member-originated report; at minimum, the
  // reporter_memberuser_id should not be null when reports are created via the
  // memberUser actor.
  await TestValidator.predicate(
    "reporter_memberuser_id should be present for member-originated report",
    async () =>
      report.reporter_memberuser_id !== null &&
      report.reporter_memberuser_id !== undefined,
  );
}
