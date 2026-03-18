import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingTimelogSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimelogSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeTrackingTimelogSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingTimelogSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timelog_snapshots_empty_result_returns_empty_page(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate a member and establish an organization-scoped context
  const memberConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd_" + RandomGenerator.alphabets(10),
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 1 }),
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    href: "https://example.com/join",
    referrer: "https://example.com/",
    organizationLogoUrl: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: joinInput,
  });
  typia.assert(authorized);
  // 2) Call timelog snapshots with a restrictive filter expected to match zero rows
  const start = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 minutes ago
  const end = new Date(Date.now() - 4 * 60 * 1000).toISOString(); // 4 minutes ago
  const randomWorkflowStatus = `__unlikely_status_${RandomGenerator.alphabets(16)}__`;
  const response =
    await api.functional.erpHrmTimeTracking.member.timelogSnapshots.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
          createdAtFrom: start,
          createdAtTo: end,
          workflowStatus: randomWorkflowStatus,
        } satisfies IErpHrmTimeTrackingTimelogSnapshot.IRequest,
      },
    );
  typia.assert(response);
  // 3) Validate empty paginated result shape and metadata
  TestValidator.equals("records should be 0", response.pagination.records, 0);
  TestValidator.equals("pages should be 0", response.pagination.pages, 0);
  TestValidator.equals("data should be empty", response.data, []);
}
