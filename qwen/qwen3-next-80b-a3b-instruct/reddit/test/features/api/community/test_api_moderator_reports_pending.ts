import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import type { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_reports_pending(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator-specific connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Step 1: Register and authenticate as moderator using utility function
  await authorize_moderator_join(moderatorConnection, {
    body: {} satisfies ICommunityModerator.IJoin,
  });
  // Step 2: Call the reports endpoint to retrieve pending reports
  const reports =
    await api.functional.community.moderator.reports.get(moderatorConnection);
  typia.assert(reports);
  // Step 3: Validate response structure against IPageICommunityReport
  // Check pagination properties
  TestValidator.equals("pagination current", reports.pagination.current, 1);
  TestValidator.equals("pagination limit", reports.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records >= 0",
    reports.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    reports.pagination.pages >= 0,
  );
  // Check that data array exists and is of correct type
  TestValidator.predicate(
    "reports data array exists",
    Array.isArray(reports.data),
  );
  TestValidator.predicate(
    "reports data length <= 20",
    reports.data.length <= 20,
  );
  // Verify each report in data is an object (ICommunityReport is {} - empty object structure)
  for (const report of reports.data) {
    TestValidator.equals("each report is object", typeof report, "object");
    TestValidator.equals("each report is not null", report !== null, true);
    TestValidator.equals(
      "each report is not array",
      !Array.isArray(report),
      true,
    );
  }
}
