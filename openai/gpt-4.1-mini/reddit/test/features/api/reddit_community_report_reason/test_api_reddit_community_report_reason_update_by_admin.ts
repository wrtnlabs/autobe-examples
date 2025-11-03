import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportReason";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";

export async function test_api_reddit_community_report_reason_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user joins for authentication and authorization
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        user_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Perform the update of a reddit community report reason by admin
  const reasonCode: string = typia.random<string>();
  const updateBody = {
    reason_name: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 12,
    }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 5,
      wordMax: 10,
    }),
    updated_at: new Date().toISOString(),
  } satisfies IRedditCommunityReportReason.IUpdate;

  const updatedReportReason: IRedditCommunityReportReason =
    await api.functional.redditCommunity.admin.redditCommunityReportReasons.update(
      connection,
      {
        reasonCode,
        body: updateBody,
      },
    );
  typia.assert(updatedReportReason);

  // 3. Validate that the update response matches the input update data
  TestValidator.equals(
    "updated reason_name matches input",
    updatedReportReason.reason_name,
    updateBody.reason_name,
  );
  TestValidator.equals(
    "updated description matches input",
    updatedReportReason.description ?? null,
    updateBody.description ?? null,
  );
  TestValidator.equals(
    "updated updated_at matches input",
    updatedReportReason.updated_at,
    updateBody.updated_at,
  );
}
