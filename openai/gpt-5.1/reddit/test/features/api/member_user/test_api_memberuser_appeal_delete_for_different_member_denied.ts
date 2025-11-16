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
 * Verify that a different member user cannot delete another member's appeal.
 *
 * Business context: This test ensures that ownership-based authorization is
 * enforced for deleting appeals in the community platform. When a member user
 * (A) creates a report and an associated appeal, another authenticated member
 * user (B) must not be allowed to delete that appeal via the memberUser erase
 * endpoint.
 *
 * Flow:
 *
 * 1. Register member user A (owner) via /auth/memberUser/join.
 * 2. As member A, create a report via /communityPlatform/memberUser/reports.
 * 3. As member A, create an appeal for that report via
 *    /communityPlatform/memberUser/reports/{reportId}/appeals.
 * 4. Register member user B via /auth/memberUser/join, switching the connection
 *    context to B.
 * 5. As member B, attempt to delete the appeal owned by member A via
 *    /communityPlatform/memberUser/reports/{reportId}/appeals/{appealId}.
 *
 * Expectations:
 *
 * - The deletion attempt by member B must fail, which we assert using
 *   TestValidator.error without inspecting HTTP status codes.
 * - We rely on the failure of the erase call itself as evidence that non-owners
 *   cannot delete appeals through this endpoint.
 */
export async function test_api_memberuser_appeal_delete_for_different_member_denied(
  connection: api.IConnection,
) {
  // 1. Register member user A (owner)
  const joinABody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinABody,
    });
  typia.assert(memberA);

  // 2. Create a report as member A
  const reportBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: "low",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportBody,
      },
    );
  typia.assert(report);

  // 3. Create an appeal for that report as member A
  const appealCreateBody = {
    appeal_scope: "content",
    reason_summary: RandomGenerator.paragraph({ sentences: 3 }),
    details: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPlatformAppeal.ICreate;

  const appeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.reports.appeals.create(
      connection,
      {
        reportId: report.id,
        body: appealCreateBody,
      },
    );
  typia.assert(appeal);

  // 4. Register member user B (non-owner) and switch context
  const joinBBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBBody,
    });
  typia.assert(memberB);

  // 5. As member B, attempt to delete member A's appeal and expect an error
  await TestValidator.error(
    "non-owner member user cannot delete another member's appeal",
    async () => {
      await api.functional.communityPlatform.memberUser.reports.appeals.erase(
        connection,
        {
          reportId: report.id,
          appealId: appeal.id,
        },
      );
    },
  );
}
