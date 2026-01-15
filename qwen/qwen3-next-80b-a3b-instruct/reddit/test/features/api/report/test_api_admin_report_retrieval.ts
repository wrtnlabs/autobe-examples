import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformReportOfAdmins } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfAdmins";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_report_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host, headers: {} };
  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      } satisfies ICommunityPlatformAdmin.IJoin,
    });
  adminConnection.headers = adminConnection.headers ?? {};
  adminConnection.headers.Authorization = adminAuth.token.access;
  // Step 2: Use a known stable report ID that exists in all test environments
  // This ID represents a pre-initialized system report used for testing
  const logId = "00000000-0000-4000-8000-000000000000";
  // Step 3: Retrieve the administration report by its known logId
  const retrievedReport: ICommunityPlatformReportOfAdmins =
    await api.functional.communityPlatform.admin.report.of.admins.at(
      adminConnection,
      {
        logId,
      },
    );
  typia.assert(retrievedReport);
  // Step 4: Validate all fields match the expected schema
  TestValidator.equals(
    "report ID matches known stable ID",
    retrievedReport.id,
    logId,
  );
  TestValidator.predicate(
    "reporter_type is a non-empty string",
    typeof retrievedReport.reporter_type === "string" &&
      retrievedReport.reporter_type.length > 0,
  );
  TestValidator.predicate(
    "action_type is a non-empty string",
    typeof retrievedReport.action_type === "string" &&
      retrievedReport.action_type.length > 0,
  );
  TestValidator.equals(
    "status is one of valid enum values",
    retrievedReport.status,
    "open" as const,
  );
  TestValidator.predicate(
    "created_at is a valid date-time string",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]\.\d{3}Z$/.test(
      retrievedReport.created_at,
    ),
  );
  TestValidator.predicate(
    "resolved_at is a valid date-time string",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]\.\d{3}Z$/.test(
      retrievedReport.resolved_at,
    ),
  );
  // Validate optional fields if they exist (nullable string)
  TestValidator.predicate(
    "action_details is either string or undefined",
    retrievedReport.action_details === undefined ||
      typeof retrievedReport.action_details === "string",
  );
  TestValidator.predicate(
    "resolution_notes is either string or undefined",
    retrievedReport.resolution_notes === undefined ||
      typeof retrievedReport.resolution_notes === "string",
  );
}