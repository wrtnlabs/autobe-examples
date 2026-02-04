import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_moderation_reports_filter_by_status_and_type(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create moderator connection and authenticate via utility function
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    },
  });
  typia.assert(moderatorAuth);
  // Step 2: Prepare filter criteria
  const filterStatus: "pending" | "approved" | "dismissed" =
    RandomGenerator.pick(["pending", "approved", "dismissed"] as const);
  const filterType: "post" | "comment" = RandomGenerator.pick([
    "post",
    "comment",
  ] as const);
  const pagination = {
    page: 1,
    limit: 20,
  };
  // Step 3: Call index endpoint with filter criteria
  const reports =
    await api.functional.communityPlatform.moderator.moderation.reports.index(
      moderatorConnection,
      {
        body: {
          status: filterStatus,
          target_type: filterType,
          page: pagination.page,
          limit: pagination.limit,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(reports);
  // Step 4: Validate response structure and pagination
  TestValidator.equals(
    "page number matches request",
    reports.pagination.current,
    pagination.page,
  );
  TestValidator.equals(
    "limit matches request",
    reports.pagination.limit,
    pagination.limit,
  );
  TestValidator.predicate(
    "records count >= 0",
    reports.pagination.records >= 0,
  );
  TestValidator.predicate("pages >= 0", reports.pagination.pages >= 0);
  // Step 5: Validate all returned reports match filter criteria
  reports.data.forEach((report) => {
    // Create explicit mapping from lowercase to capitalized status
    const statusMapping: Record<"pending" | "approved" | "dismissed", "Pending" | "Approved" | "Dismissed"> = {
      pending: "Pending",
      approved: "Approved",
      dismissed: "Dismissed",
    } as const;
    const expectedStatus: "Pending" | "Approved" | "Dismissed" = statusMapping[filterStatus];
    
    TestValidator.equals(
      "filtered by status",
      report.status,
      expectedStatus
    );
    TestValidator.equals(
      "filtered by target type",
      report.target_type,
      filterType,
    );
    // typia.assert() guarantees UUID format and date-time format
    // No manual validation needed beyond typia.assert()
    TestValidator.predicate(
      "reporter_username is non-empty",
      report.reporter_username.length > 0,
    );
  });
  // Step 6: Validate that reason text is excluded (as per spec)
  // The ISummary definition doesn't include reason property, so we verify it's not present
  reports.data.forEach((report) => {
    TestValidator.predicate(
      "reason property is excluded",
      !Object.hasOwn(report, "reason"),
    );
  });
}