import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_report_reason_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successfully retrieve a report reason by a valid existing UUID.
  // Scenario 2: Fail to retrieve a report reason with a non-existent UUID.
  // Scenario 3: Fail to retrieve a report reason without authentication.
  // Create a user and authenticated user connection
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(connection, {});
  userConnection.headers = { Authorization: authorizedUser.token.access };
  // Scenario 1: Use random valid report reason object to get a valid UUID
  const randomReportReason = typia.random<ICommunityPlatformReportReason>();
  const validReportReasonId = randomReportReason.id;
  const reportReason = await api.functional.communityPlatform.reportReasons.at(
    userConnection,
    {
      reportReasonId: validReportReasonId,
    },
  );
  typia.assert(reportReason);
  TestValidator.predicate(
    "reportReason.id is uuid",
    typeof reportReason.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
        reportReason.id,
      ),
  );
  TestValidator.predicate(
    "reportReason.reasonText is non-empty string",
    typeof reportReason.reasonText === "string" &&
      reportReason.reasonText.length > 0,
  );
  TestValidator.predicate(
    "reportReason.createdAt is valid iso date",
    !isNaN(Date.parse(reportReason.createdAt)),
  );
  TestValidator.predicate(
    "reportReason.updatedAt is valid iso date",
    !isNaN(Date.parse(reportReason.updatedAt)),
  );
  TestValidator.predicate(
    "reportReason.deletedAt is null or valid iso date",
    reportReason.deletedAt === null ||
      !isNaN(Date.parse(reportReason.deletedAt ?? "")),
  );
  // Scenario 2: Use a non-existent UUID expecting 404
  await TestValidator.httpError("not found UUID returns 404", 404, async () => {
    await api.functional.communityPlatform.reportReasons.at(userConnection, {
      reportReasonId: typia.random<string & tags.Format<"uuid">>(), // random uuid unlikely to exist
    });
  });
  // Scenario 3: Unauthorized access
  // Call without Authorization header
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access returns 401",
    401,
    async () => {
      await api.functional.communityPlatform.reportReasons.at(
        unauthenticatedConnection,
        {
          reportReasonId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
