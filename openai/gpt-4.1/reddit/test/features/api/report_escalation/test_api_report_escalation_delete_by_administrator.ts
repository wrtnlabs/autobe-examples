import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportEscalation";

/**
 * Validates permanent deletion of a report escalation by an authenticated
 * administrator.
 *
 * This test covers the core scenario and edge cases:
 *
 * 1. Create and authenticate a new administrator
 * 2. Create a new report escalation with fake report reference (via random UUID)
 * 3. Delete the report escalation via erase endpoint
 * 4. Confirm deletion does not error (void response)
 * 5. Try to delete the same escalation again, expecting rejection
 * 6. Attempt to delete a random/non-existent escalation ID, expecting error
 */
export async function test_api_report_escalation_delete_by_administrator(
  connection: api.IConnection,
) {
  // 1. Create and authenticate administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: "supersecure1!",
      business_status: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Create a community platform escalation (with a fake report ID)
  const fakeReportId = typia.random<string & tags.Format<"uuid">>();
  const escalationCreate =
    await api.functional.communityPlatform.administrator.reportEscalations.create(
      connection,
      {
        body: {
          report_id: fakeReportId,
          escalation_reason: RandomGenerator.paragraph({ sentences: 2 }),
          escalation_status: "in_progress",
        } satisfies ICommunityPlatformReportEscalation.ICreate,
      },
    );
  typia.assert(escalationCreate);
  const escalationId = escalationCreate.id;

  // 3. Delete the escalation by id (success case)
  await api.functional.communityPlatform.administrator.reportEscalations.erase(
    connection,
    {
      reportEscalationId: escalationId,
    },
  );

  // 4. Try to delete again (expect failure)
  await TestValidator.error(
    "should reject double deletion of same escalation",
    async () => {
      await api.functional.communityPlatform.administrator.reportEscalations.erase(
        connection,
        {
          reportEscalationId: escalationId,
        },
      );
    },
  );

  // 5. Attempt to delete a random non-existent escalation (expect error)
  await TestValidator.error(
    "should reject deletion of non-existent escalation id",
    async () => {
      await api.functional.communityPlatform.administrator.reportEscalations.erase(
        connection,
        {
          reportEscalationId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
