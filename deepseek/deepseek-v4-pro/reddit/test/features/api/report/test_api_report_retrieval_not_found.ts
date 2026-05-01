import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import type { ICommunityHubReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that requesting a non-existent report ID returns HTTP 404 Not Found.
 *
 * Validates that the report retrieval endpoint properly handles requests for report IDs that do not correspond to any existing report record. An authenticated member is registered and then attempts to access a report using a randomly generated UUID that has never been associated with any report.
 *
 * The system must return HTTP 404 Not Found, confirming that the report lookup is performed correctly and missing records are properly handled before any authorization checks.
 *
 * 1. Register a new member via authorize_member_join to establish an authenticated session.
 * 2. Generate a random UUID for a non-existent report.
 * 3. Attempt to retrieve the non-existent report and verify the system returns 404.
 */
export async function test_api_report_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Generate a random UUID for a non-existent report
  const nonExistentReportId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve the non-existent report and verify 404
  await TestValidator.httpError(
    "non-existent report returns 404",
    404,
    async () => {
      await api.functional.communityHub.member.reports.at(memberConnection, {
        reportId: nonExistentReportId,
      });
    },
  );
}
