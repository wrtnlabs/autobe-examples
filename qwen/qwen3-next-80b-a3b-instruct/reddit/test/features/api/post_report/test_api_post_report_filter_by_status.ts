import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsPostReport";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_post_report_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string & tags.MinLength<8> & tags.MaxLength<128>
      >(),
    } satisfies ICommunityBbsAdmin.IJoin,
  });
  // Test filtering by pending status
  const pendingResponse =
    await api.functional.communityBbs.admin.post_reports.index(
      adminConnection,
      {
        body: { status: "pending" } satisfies ICommunityBbsPostReport.IRequest,
      },
    );
  typia.assert(pendingResponse);
  TestValidator.equals(
    "response schema validation",
    Array.isArray(pendingResponse.data),
    true,
  );
  TestValidator.equals(
    "has pagination data",
    pendingResponse.pagination !== undefined,
    true,
  );
  TestValidator.predicate(
    "no reports returned should be non-pending",
    () => !pendingResponse.data.some((report) => report.status !== "pending"),
  );
  // Test filtering by resolved status
  const resolvedResponse =
    await api.functional.communityBbs.admin.post_reports.index(
      adminConnection,
      {
        body: { status: "resolved" } satisfies ICommunityBbsPostReport.IRequest,
      },
    );
  typia.assert(resolvedResponse);
  TestValidator.equals(
    "response schema validation",
    Array.isArray(resolvedResponse.data),
    true,
  );
  TestValidator.equals(
    "has pagination data",
    resolvedResponse.pagination !== undefined,
    true,
  );
  TestValidator.predicate(
    "no reports returned should be non-resolved",
    () => !resolvedResponse.data.some((report) => report.status !== "resolved"),
  );
  // Test filtering by dismissed status
  const dismissedResponse =
    await api.functional.communityBbs.admin.post_reports.index(
      adminConnection,
      {
        body: {
          status: "dismissed",
        } satisfies ICommunityBbsPostReport.IRequest,
      },
    );
  typia.assert(dismissedResponse);
  TestValidator.equals(
    "response schema validation",
    Array.isArray(dismissedResponse.data),
    true,
  );
  TestValidator.equals(
    "has pagination data",
    dismissedResponse.pagination !== undefined,
    true,
  );
  TestValidator.predicate(
    "no reports returned should be non-dismissed",
    () =>
      !dismissedResponse.data.some((report) => report.status !== "dismissed"),
  );
  // Test that no status parameter returns a response (just validation)
  const allResponse =
    await api.functional.communityBbs.admin.post_reports.index(
      adminConnection,
      {
        body: {} satisfies ICommunityBbsPostReport.IRequest,
      },
    );
  typia.assert(allResponse);
  TestValidator.equals(
    "response schema validation",
    Array.isArray(allResponse.data),
    true,
  );
  TestValidator.equals(
    "has pagination data",
    allResponse.pagination !== undefined,
    true,
  );
  // Validate that the response conforms to the IPageICommunityBbsPostReport.ISummary interface
  TestValidator.predicate("data is array of summaries", () =>
    allResponse.data.every(
      (report) =>
        typeof report.report_reason === "string" &&
        typeof report.status === "string" &&
        typeof report.created_at === "string" &&
        typeof report.reported_by === "string" &&
        typeof report.post_id === "string",
    ),
  );
}
