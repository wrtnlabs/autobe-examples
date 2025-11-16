import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAppeal";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformUserSanction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanction";

/**
 * Verify that a community moderator cannot update an appeal without being
 * authenticated.
 *
 * Business context: The community platform exposes a moderator-only endpoint
 * PUT /communityPlatform/communityModerator/appeals/{appealId} that allows
 * community moderators to update appeal workflow fields such as status and
 * outcome summaries. This operation must be protected so that anonymous or
 * non-moderator callers cannot change appeal state.
 *
 * Scenario under test:
 *
 * 1. A regular member user joins the platform and becomes authenticated.
 * 2. As this member user, a report is created.
 * 3. The same member user submits an appeal, producing a concrete appeal id.
 * 4. Using a new unauthenticated connection (no Authorization header), the test
 *    attempts to call the moderator-only update endpoint for that appeal,
 *    passing a syntactically valid ICommunityPlatformAppeal.IUpdate payload
 *    that would change appeal_status and outcome_summary if allowed.
 * 5. The API call is expected to fail with an authorization error because the
 *    caller is not logged in as a communityModerator.
 *
 * Assertions:
 *
 * - The unauthorized moderator update request results in an error.
 * - The test does not rely on specific HTTP status codes, only that the operation
 *   fails, preserving role-based access control.
 */
export async function test_api_moderator_cannot_update_appeal_without_authentication(
  connection: api.IConnection,
) {
  // 1. Member user joins and becomes authenticated
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join" as string & tags.Format<"uri">,
    referrer: "https://example.com/landing" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create a report as the authenticated member user
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: null,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(report);

  // 3. Create an appeal as the same member user
  const appealCreateBody = {
    appeal_scope: "content",
    reason_summary: RandomGenerator.paragraph({ sentences: 2 }),
    details: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ICommunityPlatformAppeal.ICreate;

  const appeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.appeals.create(
      connection,
      {
        body: appealCreateBody,
      },
    );
  typia.assert(appeal);

  // 4. Prepare an unauthenticated connection (no Authorization header)
  const unauthConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 5. Attempt to update the appeal via moderator endpoint without auth
  const appealUpdateBody = {
    appeal_status: "accepted",
    outcome_summary: "decision_upheld",
  } satisfies ICommunityPlatformAppeal.IUpdate;

  await TestValidator.error(
    "unauthenticated moderator appeal update must fail",
    async () => {
      await api.functional.communityPlatform.communityModerator.appeals.update(
        unauthConn,
        {
          appealId: appeal.id,
          body: appealUpdateBody,
        },
      );
    },
  );
}
