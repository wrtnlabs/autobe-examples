import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

/**
 * Verify that deleting an appeal with non-existent or mismatched identifiers
 * fails safely.
 *
 * Business goal
 *
 * - Ensure that DELETE
 *   /communityPlatform/memberUser/reports/{reportId}/appeals/{appealId} does
 *   not succeed when the target appeal does not exist under the specified
 *   report.
 * - Confirm that the endpoint returns an HTTP error instead of silently
 *   succeeding when given a random, non-existent appealId.
 *
 * Scope and limitations
 *
 * - We can create member users and reports via the provided APIs.
 * - No API is exposed to create or fetch individual appeals, so we cannot build a
 *   true mismatched reportId/appealId pair where the appeal actually exists.
 * - Therefore, this test focuses on the non-existent appealId case only and
 *   treats the original "mismatched" scenario as non-implementable with the
 *   given SDK.
 *
 * Steps
 *
 * 1. Register and authenticate a member user using auth.memberUser.join; the SDK
 *    automatically attaches the access token to connection.headers.
 * 2. Create a new moderation report via
 *    communityPlatform.memberUser.reports.create and capture its id as
 *    reportId.
 * 3. Generate a random UUID to act as a non-existent appealId.
 * 4. Call communityPlatform.memberUser.reports.appeals.erase with the valid
 *    reportId and the random appealId, wrapping the call in TestValidator.error
 *    to assert that an error is thrown (e.g., because the appeal does not exist
 *    or is not associated with the report).
 * 5. Because there is no API to inspect appeals or re-fetch report aggregates, we
 *    do not assert on side-effect state; we only ensure that the deletion does
 *    not succeed silently for clearly invalid identifiers.
 */
export async function test_api_memberuser_appeal_delete_on_nonexistent_ids(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member user
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
    ip: "203.0.113.42",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const authorizedMember: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorizedMember);

  // 2. Create a new moderation report owned by this member user
  const createReportBody: ICommunityPlatformReport.ICreate =
    typia.random<ICommunityPlatformReport.ICreate>();

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: createReportBody,
      },
    );
  typia.assert<ICommunityPlatformReport>(report);

  // 3. Prepare a random, non-existent appealId
  const nonExistentAppealId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Attempt to delete an appeal that does not exist under this report
  await TestValidator.error(
    "erase must fail when appealId does not exist for given reportId",
    async () => {
      await api.functional.communityPlatform.memberUser.reports.appeals.erase(
        connection,
        {
          reportId: report.id,
          appealId: nonExistentAppealId,
        },
      );
    },
  );
}
