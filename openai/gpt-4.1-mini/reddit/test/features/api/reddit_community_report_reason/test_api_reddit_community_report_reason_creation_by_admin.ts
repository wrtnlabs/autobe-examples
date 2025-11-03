import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportReason";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";

export async function test_api_reddit_community_report_reason_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain authorization and token
  const adminCreateBody = {
    user_id: typia.random<string & tags.Format<"uuid">>(),
  };
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create new reddit community report reason
  // Prepare request body with unique reason_code, reason_name, description, and timestamps
  const nowISOString = new Date().toISOString();
  const reportReasonCreateBody = {
    reason_code: `code_${RandomGenerator.alphaNumeric(8)}`,
    reason_name: `Reason ${RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 })}`,
    description: RandomGenerator.content({ paragraphs: 1 }),
    created_at: nowISOString,
    updated_at: nowISOString,
  } satisfies IRedditCommunityReportReason.ICreate;

  const reportReason: IRedditCommunityReportReason =
    await api.functional.redditCommunity.admin.redditCommunityReportReasons.create(
      connection,
      {
        body: reportReasonCreateBody,
      },
    );
  typia.assert(reportReason);

  // 3. Validate the fields are correct
  TestValidator.predicate(
    "created report reason has valid UUID id",
    typeof reportReason.id === "string" && reportReason.id.length > 0,
  );
  TestValidator.equals(
    "created_at matches request time",
    reportReason.created_at,
    nowISOString,
  );
  TestValidator.equals(
    "updated_at matches request time",
    reportReason.updated_at,
    nowISOString,
  );
  TestValidator.equals(
    "reason_code matches request",
    reportReason.reason_code,
    reportReasonCreateBody.reason_code,
  );
  TestValidator.equals(
    "reason_name matches request",
    reportReason.reason_name,
    reportReasonCreateBody.reason_name,
  );
  TestValidator.equals(
    "description matches request",
    reportReason.description ?? null,
    reportReasonCreateBody.description ?? null,
  );
}
