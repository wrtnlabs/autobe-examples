import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformUserReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserReport";

export async function test_api_user_report_creation_rejects_duplicate_open_report_by_same_admin(
  connection: api.IConnection,
) {
  // 1. Arrange: create and authenticate an adminUser via join
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Prepare a target reported member user id (UUID). In a full system this
  //    would be an existing memberUser created elsewhere, but here we only have
  //    report-creation and admin join APIs, so we generate a UUID that
  //    satisfies the DTO constraints.
  const reportedMemberId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Act: create the first user report as this admin with status "open".
  const createPayload = {
    reported_memberuser_id: reportedMemberId,
    reason_category: "spam",
    status: "open",
    severity: "medium",
  } satisfies ICommunityPlatformUserReport.ICreate;

  const firstReport: ICommunityPlatformUserReport =
    await api.functional.communityPlatform.adminUser.userReports.create(
      connection,
      {
        body: createPayload,
      },
    );
  typia.assert<ICommunityPlatformUserReport>(firstReport);

  // Sanity check: ensure reporter_adminuser_id in the response, when present,
  // matches the authenticated admin id.
  if (
    firstReport.reporter_adminuser_id !== null &&
    firstReport.reporter_adminuser_id !== undefined
  ) {
    TestValidator.equals(
      "reporter admin id should match authenticated admin",
      firstReport.reporter_adminuser_id,
      adminAuthorized.id,
    );
  }

  // 4. Act & Assert: attempt to create a duplicate open report with the same
  //    reporter admin, reported member, reason category, and status. Business
  //    rule expects a uniqueness violation, so the second creation must fail.
  await TestValidator.error(
    "duplicate open report by same admin for same user and reason should fail",
    async () => {
      await api.functional.communityPlatform.adminUser.userReports.create(
        connection,
        {
          body: createPayload,
        },
      );
    },
  );
}
