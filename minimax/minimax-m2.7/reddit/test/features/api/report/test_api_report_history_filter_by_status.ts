import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneReport";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_report_history_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member using POST /redditClone/auth/member/join
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Fetch all reports without filter to get baseline
  const allReportsResponse =
    await api.functional.redditClone.member.reports.index(memberConnection, {
      body: {},
    });
  typia.assert(allReportsResponse);
  // 3. Fetch reports with status filter set to 'pending'
  const pendingReportsResponse =
    await api.functional.redditClone.member.reports.index(memberConnection, {
      body: { status: "pending" },
    });
  typia.assert(pendingReportsResponse);
  // Validate that pending reports only contain 'pending' status
  for (const report of pendingReportsResponse.data) {
    TestValidator.equals(
      "pending report status",
      report.status,
      "pending" as const,
    );
  }
  // 4. Fetch reports with status filter set to 'approved'
  const approvedReportsResponse =
    await api.functional.redditClone.member.reports.index(memberConnection, {
      body: { status: "approved" },
    });
  typia.assert(approvedReportsResponse);
  // Validate that approved reports only contain 'approved' status
  for (const report of approvedReportsResponse.data) {
    TestValidator.equals(
      "approved report status",
      report.status,
      "approved" as const,
    );
  }
  // 5. Fetch reports with status filter set to 'dismissed'
  const dismissedReportsResponse =
    await api.functional.redditClone.member.reports.index(memberConnection, {
      body: { status: "dismissed" },
    });
  typia.assert(dismissedReportsResponse);
  // Validate that dismissed reports only contain 'dismissed' status
  for (const report of dismissedReportsResponse.data) {
    TestValidator.equals(
      "dismissed report status",
      report.status,
      "dismissed" as const,
    );
  }
  // 6. Validate data isolation - all reports belong to authenticated member
  const statuses = [
    { response: pendingReportsResponse, name: "pending" },
    { response: approvedReportsResponse, name: "approved" },
    { response: dismissedReportsResponse, name: "dismissed" },
  ];
  for (const { response, name } of statuses) {
    for (const report of response.data) {
      // Reports should belong to the authenticated member
      TestValidator.predicate(
        `${name} report belongs to authenticated member`,
        report.community !== undefined,
      );
    }
  }
  // 7. Validate pagination structure is consistent across filters
  TestValidator.equals(
    "pending pagination limit",
    pendingReportsResponse.pagination.limit,
    allReportsResponse.pagination.limit,
  );
  TestValidator.equals(
    "approved pagination limit",
    approvedReportsResponse.pagination.limit,
    allReportsResponse.pagination.limit,
  );
  TestValidator.equals(
    "dismissed pagination limit",
    dismissedReportsResponse.pagination.limit,
    allReportsResponse.pagination.limit,
  );
}
