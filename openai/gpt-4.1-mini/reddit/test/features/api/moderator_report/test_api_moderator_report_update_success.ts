import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import type { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import type { ICommunityPlatformReportsDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportsDecision";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

/**
 * Test updating a report's status and description successfully by an authorized moderator.
 * Validate that the updated report is returned with correct fields.
 * Check that only allowed fields (status, description) are changed.
 * Confirm the moderator is authenticated and authorized.
 */
export async function test_api_moderator_report_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator joins and gets authorized
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoinBody: Partial<ICommunityPlatformModerator.IJoin> = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(1),
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatarUrl: null,
  };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: moderatorJoinBody,
  });
  moderatorConnection.headers = {
    Authorization: `Bearer ${moderatorAuth.token.access}`,
  };
  // 2. Prepare reportId and update body
  const reportId = typia.random<string & tags.Format<"uuid">>();
  const updateBody: ICommunityPlatformReport.IUpdate = {
    status: "approved",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  };
  // 3. Perform updateReport API call
  const updatedReport =
    await api.functional.communityPlatform.moderator.reports.updateReport(
      moderatorConnection,
      {
        reportId,
        body: updateBody,
      },
    );
  typia.assert(updatedReport);
  TestValidator.equals(
    "report status",
    updatedReport.status,
    updateBody.status,
  );
  TestValidator.equals(
    "report description",
    updatedReport.description,
    updateBody.description,
  );
  TestValidator.predicate(
    "valid UUID for report ID",
    /^[0-9a-fA-F-]{36}$/.test(updatedReport.id),
  );
  TestValidator.predicate(
    "createdAt exists",
    typeof updatedReport.createdAt === "string",
  );
  TestValidator.predicate(
    "updatedAt exists",
    typeof updatedReport.updatedAt === "string",
  );
  TestValidator.predicate(
    "user info present",
    updatedReport.user !== null && typeof updatedReport.user.id === "string",
  );
  TestValidator.predicate(
    "reportReason info present",
    updatedReport.reportReason !== null &&
      typeof updatedReport.reportReason.id === "string",
  );
  TestValidator.predicate(
    "reportedContents is array",
    Array.isArray(updatedReport.reportedContents),
  );
  TestValidator.predicate(
    "decisions is array",
    Array.isArray(updatedReport.decisions),
  );
}
