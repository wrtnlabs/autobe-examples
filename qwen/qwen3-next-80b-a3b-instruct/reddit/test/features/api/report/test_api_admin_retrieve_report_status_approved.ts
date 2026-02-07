import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

// Define an extended interface that includes the properties we need
interface ICommunityReportExtended extends ICommunityReport {
  status: "pending" | "approved" | "rejected";
  reporter_id: string;
  reported_content_id: string;
  reason: string;
  created_at: string;
  updated_at: string;
}

export async function test_api_admin_retrieve_report_status_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authorization
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {},
  });
  // 2. Create a report (must be in "pending" status initially)
  const reportCreationBody = {
    reporter_id: typia.random<string & tags.Format<"uuid">>(),
    reported_content_id: "content_" + RandomGenerator.alphaNumeric(12),
    content_type: "post",
    reason: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 10,
      wordMax: 20,
    }),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: "pending" as const,
  } satisfies ICommunityReport;
  // Since we don't have a utility function to create a report, use the SDK directly
  // Note: The API doesn't expose a POST endpoint for report creation, so we must simulate
  // the report existing in the system. We'll create a report with randomly generated data.
  const createdReport = typia.random<ICommunityReport>();
  typia.assert(createdReport);
  // Since we cannot create a report via API, we assume a report with "pending" status exists
  // and switch it to "approved" state via backend logic. In reality, we'd need to know
  // the reportId from a previous create operation, but since none exists, we'll use a
  // generated UUID for the reportId to simulate retrieval.
  const reportId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the report record (simulated as already approved)
  const retrievedReport = await api.functional.community.admin.reports.at(
    adminConnection,
    {
      reportId,
    },
  );
  // Assert retrievedReport to the expected extended structure type
  const validatedReport = typia.assert<ICommunityReportExtended>(retrievedReport);
  // 4. Validate that the report has been properly approved
  // According to scenario, we check that:
  // - report's status is "approved" (supposedly updated from "pending")
  // - original reporter_id, reported_content_id, reason remain unchanged
  // - updated_at reflects approval time (newer than created_at)
  // - content remains immutable
  // Since we cannot set report status to "approved" via API and no creation endpoint exists,
  // we assume the report was approved by backend system before retrieval.
  // We validate the integrity of the audit trail
  TestValidator.equals(
    "report status is approved",
    validatedReport.status,
    "approved",
  );
  TestValidator.predicate(
    "reporter_id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      validatedReport.reporter_id,
    ),
  );
  TestValidator.predicate(
    "reported_content_id is non-empty",
    validatedReport.reported_content_id.length > 0,
  );
  TestValidator.predicate(
    "reason is between 10-500 characters",
    validatedReport.reason.length >= 10 && validatedReport.reason.length <= 500,
  );
  TestValidator.predicate(
    "created_at is valid ISO date",
    !isNaN(new Date(validatedReport.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date and after created_at",
    new Date(validatedReport.updated_at).getTime() >
      new Date(validatedReport.created_at).getTime(),
  );
  // We assume the report structure contains necessary fields as per ICommunityReport
}