import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import type { IHrmTimeTrackingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_weekly_summary_report_access_and_organization_scope(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) satisfies string as string &
        tags.Format<"password">,
      href: `https://example.com/${RandomGenerator.alphabets(8)}` satisfies string as string &
        tags.Format<"uri">,
      referrer:
        `https://referrer.example.com/${RandomGenerator.alphabets(8)}` satisfies string as string &
          tags.Format<"uri">,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(owner);
  const request = {
    report_type: "weekly_summary",
    range_start_date: new Date(
      "2026-01-05T00:00:00.000Z",
    ).toISOString() satisfies string as string & tags.Format<"date-time">,
    range_end_date: new Date(
      "2026-02-01T23:59:59.999Z",
    ).toISOString() satisfies string as string & tags.Format<"date-time">,
    page: 1 satisfies number as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    sort: "+created_at",
  } satisfies IHrmTimeTrackingReport.IRequest;
  const weeklySummaries =
    await api.functional.hrmTimeTracking.owner.reports.weeklySummaries.index(
      ownerConnection,
      {
        body: request,
      },
    );
  typia.assert(weeklySummaries);
  TestValidator.predicate(
    "pagination current page is non-negative",
    weeklySummaries.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    weeklySummaries.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination record count is non-negative",
    weeklySummaries.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination page count is non-negative",
    weeklySummaries.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    weeklySummaries.data.length <= weeklySummaries.pagination.limit,
  );
  for (const summary of weeklySummaries.data) {
    typia.assert(summary);
  }
  const anonymousConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "anonymous caller cannot access weekly summaries",
    [401, 403],
    async () => {
      await api.functional.hrmTimeTracking.owner.reports.weeklySummaries.index(
        anonymousConnection,
        {
          body: request,
        },
      );
    },
  );
}
