import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";

export async function test_api_content_report_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins and authenticates to obtain JWT tokens and set Authorization header
  const adminCreate: IRedditCommunityAdmin.ICreate = {
    user_id: typia.random<string & tags.Format<"uuid">>(),
  };

  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreate,
    });
  typia.assert(admin);

  // The connection automatically acquires authorization token in headers

  // 2. Prepare an update payload for content report
  const updateBody: IRedditCommunityContentReport.IUpdate = {
    report_reason_id: typia.random<string & tags.Format<"uuid">>(),
    report_status_id: typia.random<string & tags.Format<"uuid">>(),
    additional_details: `Updated notes by admin at ${new Date().toISOString()}`,
  };

  // 3. Use a mock UUID for contentReportId to update
  const contentReportId = typia.random<string & tags.Format<"uuid">>();

  // 4. Update the content report
  const updatedReport: IRedditCommunityContentReport =
    await api.functional.redditCommunity.admin.content_reports.update(
      connection,
      {
        contentReportId,
        body: updateBody,
      },
    );
  typia.assert(updatedReport);

  // 5. Validate that the returned updatedReport has the expected updated properties
  TestValidator.equals(
    "report_reason_id should match update",
    updatedReport.report_reason_id,
    updateBody.report_reason_id,
  );
  TestValidator.equals(
    "report_status_id should match update",
    updatedReport.report_status_id,
    updateBody.report_status_id,
  );
  TestValidator.equals(
    "additional_details should match update",
    updatedReport.additional_details ?? null,
    updateBody.additional_details ?? null,
  );

  // 6. Validate audit fields exist
  TestValidator.predicate(
    "created_at is ISO date string",
    typeof updatedReport.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
        updatedReport.created_at,
      ),
  );
  TestValidator.predicate(
    "updated_at is ISO date string",
    typeof updatedReport.updated_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
        updatedReport.updated_at,
      ),
  );

  // 7. Confirm unauthorized user cannot update content report
  // Create a connection without auth header
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error("unauthorized update should fail", async () => {
    await api.functional.redditCommunity.admin.content_reports.update(
      unauthConnection,
      {
        contentReportId,
        body: updateBody,
      },
    );
  });
}
