import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_report_status_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Generate a random report ID (assuming it exists in the system)
  const reportId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Update report status to 'resolved' with a valid resolution_note
  const updateDataToResolved: ICommunityPlatformReport.IUpdate = {
    status: "resolved",
    resolution_note:
      "Report resolved after investigation and action taken. Content removed and user notified.",
  } satisfies ICommunityPlatformReport.IUpdate;
  // This should succeed
  const updatedReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.admin.reports.update(
      adminConnection,
      {
        reportId,
        body: updateDataToResolved,
      },
    );
  // Validate response type
  typia.assert(updatedReport);
  // Verify fields that are in the response type remain valid
  TestValidator.predicate(
    "daily_report_rate is positive",
    () => updatedReport.daily_report_rate >= 0,
  );
  TestValidator.predicate(
    "weekly_growth_rate within range",
    () =>
      updatedReport.weekly_growth_rate >= -1 &&
      updatedReport.weekly_growth_rate <= 1,
  );
  TestValidator.predicate(
    "monthly_growth_rate within range",
    () =>
      updatedReport.monthly_growth_rate >= -1 &&
      updatedReport.monthly_growth_rate <= 1,
  );
  // Step 5: Test that status cannot be reverted from 'resolved' to 'pending'
  const updateDataToPending: ICommunityPlatformReport.IUpdate = {
    status: "pending",
    resolution_note: "Reverting status",
  } satisfies ICommunityPlatformReport.IUpdate;
  await TestValidator.error(
    "cannot revert from resolved to pending",
    async () => {
      await api.functional.communityPlatform.admin.reports.update(
        adminConnection,
        {
          reportId,
          body: updateDataToPending,
        },
      );
    },
  );
  // Step 6: Test that resolution_note can be cleared when changing status to other values
  const updateDataToUnderReview: ICommunityPlatformReport.IUpdate = {
    status: "under_review",
    resolution_note: "",
  } satisfies ICommunityPlatformReport.IUpdate;
  // This should succeed
  const clearedReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.admin.reports.update(
      adminConnection,
      {
        reportId,
        body: updateDataToUnderReview,
      },
    );
  typia.assert(clearedReport);
  // Verify fields that are in the response type remain valid
  TestValidator.predicate(
    "daily_report_rate is positive",
    () => clearedReport.daily_report_rate >= 0,
  );
  TestValidator.predicate(
    "weekly_growth_rate within range",
    () =>
      clearedReport.weekly_growth_rate >= -1 &&
      clearedReport.weekly_growth_rate <= 1,
  );
  TestValidator.predicate(
    "monthly_growth_rate within range",
    () =>
      clearedReport.monthly_growth_rate >= -1 &&
      clearedReport.monthly_growth_rate <= 1,
  );
}
