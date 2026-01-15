import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { ICommunityPlatformReportOfGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfGuest";
import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";
export async function test_api_guest_report_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for guest authentication
  const guestConnection: api.IConnection = { host: connection.host };
  // Step 2: Authenticate guest to obtain a valid JWT token
  const authResult = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformGuest.IJoin,
  });
  typia.assert(authResult);
  // Step 3: Since we cannot create reports with available API, we assume the system has
  // generated a report with a logId associated with this guest's session
  // We will use the guest's unique ID as the logId for retrieval (as the report's guest_session_id matches)
  const reportLogId = authResult.id;
  // Step 4: Retrieve the report using the authenticated guest connection
  const retrievedReport =
    await api.functional.communityPlatform.guest.report.of.guests.at(
      guestConnection,
      {
        logId: reportLogId,
      },
    );
  typia.assert(retrievedReport);
  // Step 5: Validate the retrieved report matches the expected format and that
  // access control works (report's guest_session_id matches the authenticated guest's ID)
  TestValidator.equals(
    "guest_session_id matches authenticated guest ID",
    retrievedReport.guest_session_id,
    authResult.id,
  );
  TestValidator.equals("reason match", retrievedReport.reason, "spam");
  TestValidator.equals("status match", retrievedReport.status, "pending");
  TestValidator.predicate(
    "confidence_score is within valid range",
    retrievedReport.confidence_score >= 0 &&
      retrievedReport.confidence_score <= 1,
  );
  TestValidator.predicate(
    "description has content",
    retrievedReport.description.length > 0,
  );
  TestValidator.predicate(
    "ip_address has content",
    retrievedReport.ip_address.length > 0,
  );
  TestValidator.predicate(
    "behavior_pattern has value",
    retrievedReport.behavior_pattern.length > 0,
  );
}
