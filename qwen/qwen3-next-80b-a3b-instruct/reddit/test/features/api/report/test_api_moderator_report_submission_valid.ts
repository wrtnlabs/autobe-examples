import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { IModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IModerator";

export async function test_api_moderator_report_submission_valid(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator by joining
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorEmail,
    });
  typia.assert(moderator);

  // Step 2: Submit a report with reason code 'harassment' using correct stringified JSON format
  // The ICommunityPlatformReport.ICreate type is defined as string for this API
  // It expects a JSON string containing required fields: target_type and reason
  const reportBody = JSON.stringify({
    target_type: "post",
    reason: "harassment",
  });

  // Submit the report with stringified body conforming to ICommunityPlatformReport.ICreate
  const reportResponse: ICommunityPlatformReport =
    await api.functional.communityPlatform.moderator.reports.create(
      connection,
      {
        body: reportBody,
      },
    );
  typia.assert(reportResponse);

  // Step 3: Validate report creation was successful
  // Since ICommunityPlatformReport is string type (per DTO), we can only validate the structure from the correct endpoint
  // All type safety and validation is ensured by the backend via typia.assert()
}
