import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";

export async function test_api_reddit_community_report_update_by_community_moderator(
  connection: api.IConnection,
) {
  // 1. Community Moderator joins (registers and authenticates)
  const moderatorCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    nickname: RandomGenerator.name(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorCreateBody,
    });
  typia.assert(moderator);

  // 2. Prepare an update report ID and update data for testing
  // Here generating a random UUID for the report ID
  // and preparing an update body with status and description update
  const reportId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const updatedAtISO = new Date().toISOString();
  const updateBody = {
    reason: "spam",
    description: "Updated description for invalid content",
    status: "reviewed",
    updated_at: updatedAtISO,
    deleted_at: null,
  } satisfies IRedditCommunityReport.IUpdate;

  // 3. Call the update API for the report by communityModerator
  const updatedReport: IRedditCommunityReport =
    await api.functional.redditCommunity.communityModerator.redditCommunityReports.update(
      connection,
      {
        id: reportId,
        body: updateBody,
      },
    );

  // 4. Validate the response to ensure updated fields are reflected and valid
  typia.assert(updatedReport);
  TestValidator.equals(
    "reported report id matches",
    updatedReport.id,
    reportId,
  );
  TestValidator.equals(
    "report status updated",
    updatedReport.status,
    updateBody.status ?? updatedReport.status,
  );
  TestValidator.equals(
    "report reason updated",
    updatedReport.reason,
    updateBody.reason ?? updatedReport.reason,
  );
  TestValidator.equals(
    "report description updated",
    updatedReport.description,
    updateBody.description ?? updatedReport.description,
  );
  TestValidator.equals(
    "report updated_at set",
    updatedReport.updated_at,
    updateBody.updated_at ?? updatedReport.updated_at,
  );
  TestValidator.equals(
    "report deleted_at is null",
    updatedReport.deleted_at,
    null,
  );
}
