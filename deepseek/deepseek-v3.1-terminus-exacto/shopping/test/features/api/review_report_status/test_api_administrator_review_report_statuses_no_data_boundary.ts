import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceReviewReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewReportStatus";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceReviewReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceReviewReportStatus";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_review_report_statuses_no_data_boundary(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234" satisfies string & tags.Format<"password">,
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Search with restrictive criteria that should return no results
  const searchCriteria = {
    ecommerce_review_report_id: typia.random<string & tags.Format<"uuid">>(),
    created_start: new Date(2030, 0, 1).toISOString(),
    page: 1,
    limit: 10,
  } satisfies IEcommerceReviewReportStatus.IRequest;
  const response =
    await api.functional.ecommerce.administrator.review_report_statuses.index(
      adminConnection,
      { body: searchCriteria },
    );
  typia.assert(response);
  // Validate pagination structure with zero records
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 10);
  TestValidator.equals(
    "total records should be zero",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "total pages should be zero",
    response.pagination.pages,
    0,
  );
  TestValidator.equals("data array should be empty", response.data.length, 0);
}
