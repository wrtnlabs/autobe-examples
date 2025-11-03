import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportReason";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";

export async function test_api_report_reason_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user joins and authenticates
  const adminPayload = {
    user_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IRedditCommunityAdmin.ICreate;
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminPayload });
  typia.assert(admin);

  // 2. Create multiple report reasons
  const now = new Date().toISOString();

  const reasonsData = ArrayUtil.repeat(3, (index) => {
    return {
      reason_code: `reason_${Date.now()}_${index}`,
      reason_name: `Report Reason ${index + 1}`,
      description: `Description for report reason ${index + 1}`,
      created_at: now,
      updated_at: now,
    } satisfies IRedditCommunityReportReason.ICreate;
  });

  for (const reasonData of reasonsData) {
    const createdReason: IRedditCommunityReportReason =
      await api.functional.redditCommunity.admin.redditCommunityReportReasons.create(
        connection,
        { body: reasonData },
      );
    typia.assert(createdReason);
    TestValidator.equals(
      "reason_code matches",
      createdReason.reason_code,
      reasonData.reason_code,
    );
    TestValidator.equals(
      "reason_name matches",
      createdReason.reason_name,
      reasonData.reason_name,
    );
    TestValidator.equals(
      "description matches",
      createdReason.description ?? null,
      reasonData.description ?? null,
    );
  }
}
