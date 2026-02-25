import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_reports_listing_date_range_excludes_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. User join to authenticate and obtain user token
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  userConnection.headers = { Authorization: authorized.token.access };
  // 2. Construct a date range filter in the future (exclude all reports)
  const futureStartDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 365,
  ).toISOString(); // 1 year in the future
  const futureEndDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 366,
  ).toISOString(); // 1 year + 1 day in the future
  const requestBody: ICommunityPlatformReport.IRequest = {
    createdAtStart: futureStartDate,
    createdAtEnd: futureEndDate,
    page: 1,
    limit: 20,
  };
  // 3. Call the user reports index endpoint with the date range filter
  const response = await api.functional.communityPlatform.user.reports.index(
    userConnection,
    { body: requestBody },
  );
  typia.assert(response);
  // 4. Validate the pagination info and an empty list of reports
  TestValidator.equals("reports list should be empty", response.data.length, 0);
  TestValidator.equals(
    "pagination records count should be zero",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages count should be zero",
    response.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current page should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 20",
    response.pagination.limit,
    20,
  );
}
