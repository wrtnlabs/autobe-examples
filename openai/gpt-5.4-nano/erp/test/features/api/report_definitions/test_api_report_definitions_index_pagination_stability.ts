import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import type { IErpHrmTimeTrackingReportDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinition";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeTrackingReportDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingReportDefinition";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_report_definitions_index_pagination_stability(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a member via member join.
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = "Password!234";
  const joinPayload = {
    email,
    password,
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 3,
    href: "https://example.com/join",
    referrer: "https://example.com/referrer",
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  await authorize_member_join(memberConnection, {
    body: joinPayload,
  });
  const authorizedConnection: api.IConnection = { host: connection.host };
  authorizedConnection.headers = memberConnection.headers;
  // 2) Call PATCH /erpHrmTimeTracking/reportDefinitions with page=1 and limit=1.
  const firstPage =
    await api.functional.erpHrmTimeTracking.reportDefinitions.index(
      authorizedConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IErpHrmTimeTrackingReportDefinition.IRequest,
      },
    );
  typia.assert(firstPage);
  const firstPagination = firstPage.pagination;
  const firstData = firstPage.data;
  // 3) Validate pagination metadata and data size.
  TestValidator.equals(
    "pagination.current matches requested page",
    firstPagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.limit equals requested limit",
    firstPagination.limit,
    1,
  );
  const computedPages =
    firstPagination.records === 0
      ? 0
      : Math.ceil(firstPagination.records / firstPagination.limit);
  TestValidator.equals(
    "pagination.pages is consistent with records/limit",
    firstPagination.pages,
    computedPages,
  );
  TestValidator.predicate("data length <= limit", () => firstData.length <= 1);
  const expectedFirstDataLength = firstPagination.records === 0 ? 0 : 1;
  TestValidator.equals(
    "first page data length matches records",
    firstData.length,
    expectedFirstDataLength,
  );
  // 4) Call again with page=pagination.pages and limit=1.
  const lastRequestedPage: number = firstPagination.pages;
  const lastPage =
    await api.functional.erpHrmTimeTracking.reportDefinitions.index(
      authorizedConnection,
      {
        body: {
          page: lastRequestedPage,
          limit: 1,
        } satisfies IErpHrmTimeTrackingReportDefinition.IRequest,
      },
    );
  typia.assert(lastPage);
  // 5) Validate last page metadata.
  TestValidator.equals(
    "pagination.current equals requested last page",
    lastPage.pagination.current,
    lastRequestedPage,
  );
  TestValidator.equals(
    "pagination.records unchanged between calls",
    lastPage.pagination.records,
    firstPagination.records,
  );
  const expectedLastDataLength = expectedFirstDataLength;
  TestValidator.equals(
    "last page data length matches records",
    lastPage.data.length,
    expectedLastDataLength,
  );
  // 6) Repeat ordering check by calling page=1 again.
  const secondFirstPage =
    await api.functional.erpHrmTimeTracking.reportDefinitions.index(
      authorizedConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IErpHrmTimeTrackingReportDefinition.IRequest,
      },
    );
  typia.assert(secondFirstPage);
  if (firstPagination.records > 0) {
    TestValidator.equals(
      "page 1 first call returned 1 record",
      firstPage.data.length,
      1,
    );
    TestValidator.equals(
      "page 1 second call returned 1 record",
      secondFirstPage.data.length,
      1,
    );
    const firstId = firstPage.data[0].id;
    const secondFirstId = secondFirstPage.data[0].id;
    TestValidator.equals(
      "first element id stable on page 1",
      secondFirstId,
      firstId,
    );
  }
}
